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
} from "../model/Entity";
import { AuthorizationError, ForbiddenError } from "../util/Error";
import { AuthorizationErrorType } from "../util/Enum";
import { NotFoundError } from "elysia";
import { StorageService } from "../service/StorageService";
import { join } from "path";
import sharp from "sharp";

export enum SortField {
  TITLE = "title",
  CREATED_AT = "createdAt",
  UPDATED_AT = "updatedAt",
  VIEW_COUNT = "viewCount",
  AVERAGE_RATING = "averageRating",
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

  constructor(private userId: string) {
    this.database = database;
    this.storageService = new StorageService();
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

  async createFiction(fictionData: Partial<Fiction>): Promise<WithId<Fiction>> {
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
      limit = 10,
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
    if (author) queryConditions.author = author;
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

    const sort: { [key in SortField]?: 1 | -1 } = {
      [sortBy]: sortOrder === SortOrder.DESC ? -1 : 1,
    };

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
            localField: "tags",
            foreignField: "_id",
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
      .toArray()
      .then((results) => results[0] || null);

    if (!fiction) throw new NotFoundError("Fiction not found");

    return fiction;
  }

  async updateFiction(
    fictionId: string,
    updateData: Partial<Fiction>
  ): Promise<Fiction | null> {
    for (const tag of updateData.tags || []) {
      if (!(await this.doesTagExist(tag.toString()))) {
        throw new Error(`This tag does not exist: ${tag}`);
      }
    }
    updateData.tags = updateData.tags?.map((tag) => new ObjectId(tag)) || [];

    const result = await this.database
      .collection<Fiction>(Constant.FICTION_COLLECTION)
      .findOneAndUpdate(
        { _id: new ObjectId(fictionId), author: new ObjectId(this.userId) },
        { $set: { ...updateData, updatedAt: new Date() } },
        { returnDocument: "after" }
      );

    if (!result)
      throw new NotFoundError(
        "Fiction not found or you are not the author of this fiction"
      );

    return result;
  }

  async deleteFiction(fictionId: string): Promise<boolean> {
    const result = await this.database
      .collection<Fiction>(Constant.FICTION_COLLECTION)
      .deleteOne({
        _id: new ObjectId(fictionId),
        author: new ObjectId(this.userId),
      });

    if (!result.acknowledged) {
      throw new Error("Failed to delete fiction");
    }

    return result.deletedCount === 1;
  }

  async incrementViewCount(fictionId: string): Promise<void> {
    await this.database
      .collection<Fiction>(Constant.FICTION_COLLECTION)
      .updateOne(
        { _id: new ObjectId(fictionId) },
        { $inc: { "stats.viewCount": 1 } }
      );
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

  async createChapter(
    fictionId: string,
    chapterData: Partial<Chapter>
  ): Promise<WithId<Chapter>> {
    const fiction = await this.getFictionById(fictionId);
    if (!fiction) {
      throw new NotFoundError("Fiction not found");
    }

    if (fiction.author.toString() !== this.userId) {
      throw new ForbiddenError("You are not the author of this fiction");
    }

    const newChapter: Chapter = {
      fiction: new ObjectId(fictionId),
      chapterNumber: chapterData.chapterNumber || 0,
      title: chapterData.title || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.database
      .collection<Chapter>(Constant.CHAPTER_COLLECTION)
      .insertOne(newChapter);

    if (!result.acknowledged) {
      throw new Error("Failed to create new chapter");
    }

    return { ...newChapter, _id: result.insertedId };
  }

  async updateChapter(
    chapterId: string,
    updateData: Partial<Chapter>
  ): Promise<Chapter | null> {
    const chapter = await this.database
      .collection<Chapter>(Constant.CHAPTER_COLLECTION)
      .findOne({ _id: new ObjectId(chapterId) });

    if (!chapter) {
      throw new NotFoundError("Chapter not found");
    }

    const fiction = await this.getFictionById(chapter.fiction.toString());
    if (!fiction) {
      throw new NotFoundError("Fiction not found");
    }

    if (fiction.author.toString() !== this.userId) {
      throw new ForbiddenError("You are not the author of this fiction");
    }

    const result = await this.database
      .collection<Chapter>(Constant.CHAPTER_COLLECTION)
      .findOneAndUpdate(
        { _id: new ObjectId(chapterId) },
        { $set: { ...updateData, updatedAt: new Date() } },
        { returnDocument: "after" }
      );

    if (!result) {
      throw new NotFoundError("Chapter not found");
    }

    return result;
  }

  async deleteChapter(chapterId: string): Promise<boolean> {
    const chapter = await this.database
      .collection<Chapter>(Constant.CHAPTER_COLLECTION)
      .findOne({ _id: new ObjectId(chapterId) });

    if (!chapter) {
      throw new NotFoundError("Chapter not found");
    }

    const fiction = await this.getFictionById(chapter.fiction.toString());
    if (!fiction) {
      throw new NotFoundError("Fiction not found");
    }

    if (fiction.author.toString() !== this.userId) {
      throw new ForbiddenError("You are not the author of this fiction");
    }

    const result = await this.database
      .collection<Chapter>(Constant.CHAPTER_COLLECTION)
      .deleteOne({ _id: new ObjectId(chapterId) });

    return result.deletedCount === 1;
  }

  async getChapters(fictionId: string): Promise<Chapter[]> {
    const chapters = await this.database
      .collection<Chapter>(Constant.CHAPTER_COLLECTION)
      .find({ fiction: new ObjectId(fictionId) })
      .sort({ chapterNumber: 1 })
      .toArray();

    return chapters;
  }

  async getChapter(chapterId: string): Promise<Chapter | null> {
    const chapter = await this.database
      .collection<Chapter>(Constant.CHAPTER_COLLECTION)
      .findOne({ _id: new ObjectId(chapterId) });

    if (!chapter) {
      throw new NotFoundError("Chapter not found");
    }

    await this.incrementViewCount(chapter.fiction.toString());

    return chapter;
  }

  async uploadCover(fictionId: string, cover: File): Promise<string> {
    const fiction = await this.getFictionById(fictionId);
    if (!fiction) {
      throw new NotFoundError("Fiction not found");
    }

    if (fiction.author.toString() !== this.userId) {
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
}
