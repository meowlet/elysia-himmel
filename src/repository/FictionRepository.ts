import { Db, ObjectId, WithId } from "mongodb";
import { database } from "../database/Database";
import { Constant } from "../util/Constant";
import {
  Fiction,
  FictionStatus,
  FictionType,
  Tag,
  User,
  Chapter,
  AuthorApplicationStatus,
} from "../model/Entity";
import { AuthorizationError, ForbiddenError } from "../util/Error";
import { AuthorizationErrorType } from "../util/Enum";
import { NotFoundError } from "elysia";
import { StorageService } from "../service/StorageService";
import { join } from "path";
import sharp from "sharp";
import { AuthService } from "../service/AuthService";
import { Resource, Action } from "../util/Enum";
import { TagRepository } from "./TagRepository";

export enum SortField {
  TITLE = "title",
  CREATED_AT = "createdAt",
  UPDATED_AT = "updatedAt",
  VIEW_COUNT = "viewCount",
  AVERAGE_RATING = "averageRating",
  FAVORITE_COUNT = "favoriteCount",
}

export enum SortOrder {
  ASC = "asc",
  DESC = "desc",
}

interface QueryFictionParams {
  query?: string;
  author?: string;
  tags?: string[];
  status?: FictionStatus;
  type?: FictionType;
  createdFrom?: Date | null;
  createdTo?: Date | null;
  sortBy?: SortField;
  sortOrder?: SortOrder;
  page?: number;
  limit?: number;
  minViewCount?: number;
  minRating?: number;
}

interface QueryFictionResult {
  fictions: Fiction[];
  total: number;
}

export class FictionRepository {
  private database: Db;
  private storageService: StorageService;
  private authService: AuthService;

  constructor(private userId: string) {
    this.database = database;
    this.storageService = new StorageService();
    this.authService = new AuthService(this.database, this.userId);
  }

  public async getCurrentUser(): Promise<WithId<User>> {
    const currentUser = await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .findOne({ _id: new ObjectId(this.userId) });

    if (!currentUser) {
      throw new AuthorizationError(
        "User not found",
        AuthorizationErrorType.INVALID_TOKEN
      );
    }

    return currentUser;
  }

  async createFiction(
    fictionData: Partial<Fiction>,
    fictionCover?: File
  ): Promise<WithId<Fiction>> {
    const currentUser = await this.getCurrentUser();

    if (
      currentUser.authorApplicationStatus !==
        AuthorApplicationStatus.APPROVED &&
      !(await this.authService.hasPermission(Resource.FICTION, Action.CREATE))
    ) {
      throw new ForbiddenError(
        "You must be an approved author or have permission to create fictions"
      );
    }

    const newFiction: Fiction = {
      ...fictionData,
      author: new ObjectId(this.userId),
      title: fictionData.title || "",
      description: fictionData.description || "",
      tags: fictionData.tags?.map((tag) => new ObjectId(tag)) || [],
      status: fictionData.status || FictionStatus.ONGOING,
      type: fictionData.type || FictionType.FREE,
      stats: {
        viewCount: 0,
        ratingCount: 0,
        averageRating: 0,
        commentCount: 0,
        favoriteCount: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    for (const tag of newFiction.tags) {
      if (!(await this.doesTagExist(tag.toString()))) {
        throw new Error(`This tag does not exist: ${tag}`);
      }
    }

    const result = await this.database
      .collection<Fiction>(Constant.FICTION_COLLECTION)
      .insertOne(newFiction);

    if (!result.acknowledged) {
      throw new Error("Failed to create fiction");
    }

    if (fictionCover) {
      const buffer = await fictionCover.arrayBuffer();
      const jpegBuffer = await sharp(buffer).jpeg({ quality: 80 }).toBuffer();

      const path = join("fictions", result.insertedId.toString(), "cover.jpeg");
      await this.storageService.saveFile(
        new File([jpegBuffer], "cover.jpeg", { type: "image/jpeg" }),
        path
      );
    }

    if (newFiction.tags && newFiction.tags.length > 0) {
      const tagRepository = new TagRepository(this.userId);
      await Promise.all(
        newFiction.tags.map((tagId) =>
          tagRepository.updateTagWorkCount(new ObjectId(tagId), 1)
        )
      );
    }

    return { ...newFiction, _id: result.insertedId };
  }

  // check if the tag does exist in the tag collection
  async doesTagExist(tag: string): Promise<boolean> {
    const validTag = await this.database
      .collection<Tag>(Constant.TAG_COLLECTION)
      .findOne({ _id: new ObjectId(tag) });
    return !!validTag;
  }

  async queryFictions(params: QueryFictionParams): Promise<QueryFictionResult> {
    const {
      query,
      author,
      tags,
      status,
      type,
      createdFrom,
      createdTo,
      sortBy = SortField.CREATED_AT,
      sortOrder = SortOrder.DESC,
      page = 1,
      limit = 12,
      minViewCount,
      minRating,
    } = params;

    const queryConditions: any = {};
    if (query) {
      queryConditions.$or = [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ];
    }
    if (author) queryConditions.author = new ObjectId(author);
    if (tags && tags.length > 0)
      queryConditions.tags = { $all: tags.map((tag) => new ObjectId(tag)) };
    if (status) queryConditions.status = status;
    if (type) queryConditions.type = type;
    if (createdFrom || createdTo) {
      queryConditions.createdAt = {};
      if (createdFrom) queryConditions.createdAt.$gte = createdFrom;
      if (createdTo) queryConditions.createdAt.$lte = createdTo;
    }
    if (minViewCount)
      queryConditions["stats.viewCount"] = { $gte: minViewCount };
    if (minRating) queryConditions["stats.averageRating"] = { $gte: minRating };

    let sort: { [key: string]: 1 | -1 } = {};
    if (sortBy === SortField.VIEW_COUNT) {
      sort["stats.viewCount"] = sortOrder === SortOrder.DESC ? -1 : 1;
    } else if (sortBy === SortField.AVERAGE_RATING) {
      sort["stats.averageRating"] = sortOrder === SortOrder.DESC ? -1 : 1;
    } else if (sortBy === SortField.FAVORITE_COUNT) {
      sort["stats.favoriteCount"] = sortOrder === SortOrder.DESC ? -1 : 1;
    } else {
      sort[sortBy] = sortOrder === SortOrder.DESC ? -1 : 1;
    }

    const skip = (page - 1) * limit;

    const [fictions, total] = await Promise.all([
      this.database
        .collection<Fiction>(Constant.FICTION_COLLECTION)
        .find(queryConditions)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.database
        .collection<Fiction>(Constant.FICTION_COLLECTION)
        .countDocuments(queryConditions),
    ]);

    return { fictions, total };
  }

  async getFictionById(fictionId: string): Promise<Fiction | null> {
    return await this.database
      .collection<Fiction>(Constant.FICTION_COLLECTION)
      .findOne({ _id: new ObjectId(fictionId) });
  }

  async getFiction(fictionId: string) {
    const fiction = await this.database
      .collection<Fiction>(Constant.FICTION_COLLECTION)
      .aggregate([
        { $match: { _id: new ObjectId(fictionId) } },
        {
          $lookup: {
            from: Constant.TAG_COLLECTION,
            let: { tagIds: "$tags" },
            pipeline: [
              {
                $match: {
                  $expr: { $in: ["$_id", "$$tagIds"] },
                  $or: [
                    { isDeleted: { $exists: false } },
                    { isDeleted: false },
                  ],
                },
              },
            ],
            as: "tags",
          },
        },
        {
          $lookup: {
            from: Constant.USER_COLLECTION,
            localField: "author",
            foreignField: "_id",
            as: "author",
          },
        },
        {
          $lookup: {
            from: Constant.CHAPTER_COLLECTION,
            localField: "_id",
            foreignField: "fiction",
            as: "chapters",
          },
        },
        {
          $addFields: {
            chapters: {
              $sortArray: {
                input: "$chapters",
                sortBy: { chapterIndex: 1 },
              },
            },
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            description: 1,
            author: { $first: "$author" },
            tags: 1,
            status: 1,
            type: 1,
            stats: 1,
            createdAt: 1,
            updatedAt: 1,
            chapters: 1,
          },
        },
      ])
      .toArray()
      .then((results) => results[0] || null);

    if (!fiction) throw new NotFoundError("Fiction not found");

    return fiction;
  }

  async updateFiction(
    fictionId: string,
    updateData: Partial<Fiction>
  ): Promise<Fiction | null> {
    const fiction = await this.getFictionById(fictionId);
    if (!fiction) {
      throw new NotFoundError("Fiction not found");
    }

    const hasPermission = await this.authService.hasPermission(
      Resource.FICTION,
      Action.UPDATE
    );
    const isOwner = fiction.author.toString() === this.userId;

    if (!hasPermission && !isOwner) {
      throw new ForbiddenError(
        "You don't have permission to update this fiction"
      );
    }

    if (updateData.tags) {
      const tagRepository = new TagRepository(this.userId);

      // Tìm tags bị xóa để giảm workCount
      const removedTags = fiction.tags.filter(
        (oldTag) =>
          !updateData.tags!.some(
            (newTag) => newTag.toString() === oldTag.toString()
          )
      );

      // Tìm tags mới để tăng workCount
      const addedTags = updateData.tags.filter(
        (newTag) =>
          !fiction.tags.some(
            (oldTag) => oldTag.toString() === newTag.toString()
          )
      );

      // Cập nhật workCount
      await Promise.all([
        ...removedTags.map((tagId) =>
          tagRepository.updateTagWorkCount(new ObjectId(tagId), -1)
        ),
        ...addedTags.map((tagId) =>
          tagRepository.updateTagWorkCount(new ObjectId(tagId), 1)
        ),
      ]);

      updateData.tags = updateData.tags.map((tag) => new ObjectId(tag));
    }

    if (!hasPermission && updateData.type) {
      throw new ForbiddenError(
        "You don't have permission to update the type of the fiction"
      );
    }

    const result = await this.database
      .collection<Fiction>(Constant.FICTION_COLLECTION)
      .findOneAndUpdate(
        { _id: new ObjectId(fictionId) },
        { $set: { ...updateData, updatedAt: new Date() } },
        { returnDocument: "after" }
      );

    if (!result) throw new Error("Failed to update fiction");

    return result;
  }

  async deleteFiction(fictionId: string): Promise<boolean> {
    const fiction = await this.getFictionById(fictionId);
    if (!fiction) {
      throw new NotFoundError("Fiction not found");
    }

    const hasPermission = await this.authService.hasPermission(
      Resource.FICTION,
      Action.DELETE
    );
    const isOwner = fiction.author.toString() === this.userId;

    if (!hasPermission && !isOwner) {
      throw new ForbiddenError(
        "You don't have permission to delete this fiction"
      );
    }

    if (fiction.tags && fiction.tags.length > 0) {
      const tagRepository = new TagRepository(this.userId);
      await Promise.all(
        fiction.tags.map((tagId) =>
          tagRepository.updateTagWorkCount(new ObjectId(tagId), -1)
        )
      );
    }

    const result = await this.database
      .collection<Fiction>(Constant.FICTION_COLLECTION)
      .deleteOne({ _id: new ObjectId(fictionId) });

    if (!result.acknowledged) {
      throw new Error("Failed to delete fiction");
    }

    return result.deletedCount === 1;
  }

  async incrementViewCount(fictionId: string) {
    const result = await this.database
      .collection<Fiction>(Constant.FICTION_COLLECTION)
      .updateOne(
        { _id: new ObjectId(fictionId) },
        { $inc: { "stats.viewCount": 1 } }
      );

    if (!result.acknowledged) {
      throw new Error("Failed to increment view count");
    }

    return result.modifiedCount === 1;
  }

  async updateRating(fictionId: string, newRating: number): Promise<void> {
    const fiction = await this.getFictionById(fictionId);
    if (!fiction) throw new Error("Fiction not found");

    const newTotalRating =
      fiction.stats.averageRating * fiction.stats.ratingCount + newRating;
    const newRatingCount = fiction.stats.ratingCount + 1;
    const newAverageRating = newTotalRating / newRatingCount;

    await this.database
      .collection<Fiction>(Constant.FICTION_COLLECTION)
      .updateOne(
        { _id: new ObjectId(fictionId) },
        {
          $set: {
            "stats.averageRating": newAverageRating,
            "stats.ratingCount": newRatingCount,
          },
        }
      );
  }

  async uploadCover(fictionId: string, cover: File): Promise<string> {
    const fiction = await this.getFictionById(fictionId);
    if (!fiction) {
      throw new NotFoundError("Fiction not found");
    }

    if (
      fiction.author.toString() !== this.userId &&
      !(await this.authService.hasPermission(Resource.FICTION, Action.UPDATE))
    ) {
      throw new ForbiddenError("You are not the author of this fiction");
    }

    const buffer = await cover.arrayBuffer();
    const jpegBuffer = await sharp(buffer).jpeg({ quality: 80 }).toBuffer();

    const path = join("fictions", fictionId, "cover.jpeg");
    return await this.storageService.saveFile(
      new File([jpegBuffer], "cover.jpeg", { type: "image/jpeg" }),
      path
    );
  }

  async favoriteFiction(fictionId: string): Promise<boolean> {
    const fiction = await this.getFictionById(fictionId);
    if (!fiction) {
      throw new NotFoundError("Fiction not found");
    }

    const userId = new ObjectId(this.userId);
    const fictionObjectId = new ObjectId(fictionId);

    const user = await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .findOne({ _id: userId });

    if (!user) {
      throw new AuthorizationError(
        "User not found",
        AuthorizationErrorType.INVALID_TOKEN
      );
    }

    const isFavorited = user.favorites?.some((id) =>
      (id as ObjectId).equals(fictionObjectId)
    );

    let userUpdateOperation;
    let fictionUpdateOperation;
    if (isFavorited) {
      userUpdateOperation = { $pull: { favorites: fictionObjectId } };
      fictionUpdateOperation = { $inc: { "stats.favoriteCount": -1 } };
    } else {
      userUpdateOperation = { $addToSet: { favorites: fictionObjectId } };
      fictionUpdateOperation = { $inc: { "stats.favoriteCount": 1 } };
    }

    const result = await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .updateOne({ _id: userId }, userUpdateOperation);

    await this.database
      .collection<Fiction>(Constant.FICTION_COLLECTION)
      .updateOne({ _id: fictionObjectId }, fictionUpdateOperation);

    if (!result.acknowledged) {
      throw new Error("Failed to update favorite status");
    }

    return !isFavorited;
  }

  async getRandomFictions(limit: number = 10) {
    const fictions = await this.database
      .collection<Fiction>(Constant.FICTION_COLLECTION)
      .aggregate([
        { $sample: { size: limit } },
        {
          $lookup: {
            from: Constant.TAG_COLLECTION,
            let: { tagIds: "$tags" },
            pipeline: [
              {
                $match: {
                  $expr: { $in: ["$_id", "$$tagIds"] },
                  $or: [
                    { isDeleted: { $exists: false } },
                    { isDeleted: false },
                  ],
                },
              },
            ],
            as: "tags",
          },
        },
        {
          $lookup: {
            from: Constant.USER_COLLECTION,
            localField: "author",
            foreignField: "_id",
            as: "author",
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            description: 1,
            author: { $first: "$author" },
            tags: 1,
            status: 1,
            type: 1,
            stats: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ])
      .toArray();

    return fictions;
  }
}
