import { Db, ObjectId, WithId } from "mongodb";
import { database } from "../database/Database";
import { Constant } from "../util/Constant";
import {
  Fiction,
  FictionStatus,
  FictionType,
  Tag,
  User,
} from "../model/Entity";
import { AuthorizationError } from "../util/Error";
import { AuthorizationErrorType } from "../util/Enum";

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
  title?: string;
  authorId?: string;
  tags?: string[];
  genres?: string[];
  status?: FictionStatus;
  type?: FictionType;
  createdFrom?: Date;
  createdTo?: Date;
  sortBy?: SortField;
  sortOrder?: SortOrder;
  page?: number;
  limit?: number;
}

interface QueryFictionResult {
  fictions: Fiction[];
  total: number;
}

export class FictionRepository {
  private database: Db;

  constructor(private userId: string) {
    this.database = database;
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
      authorId: new ObjectId(this.userId).toString(),
      title: fictionData.title || "",
      description: fictionData.description || "",
      // The tags must be an array of ObjectId
      tags: fictionData.tags?.map((tag) => new ObjectId(tag).toString()) || [],
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
      if (!(await this.doesTagExist(tag))) {
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
      title,
      authorId,
      tags,
      genres,
      status,
      type,
      createdFrom,
      createdTo,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 10,
    } = params;

    const query: any = {};
    if (title) query.title = { $regex: title, $options: "i" };
    if (authorId) query.authorId = new ObjectId(authorId);
    if (tags && tags.length > 0) query.tags = { $all: tags };
    if (genres && genres.length > 0) query.genres = { $all: genres };
    if (status) query.status = status;
    if (type) query.type = type;
    if (createdFrom || createdTo) {
      query.createdAt = {};
      if (createdFrom) query.createdAt.$gte = createdFrom;
      if (createdTo) query.createdAt.$lte = createdTo;
    }

    const sort: { [key in SortField]?: 1 | -1 } = {
      [sortBy]: sortOrder === "desc" ? -1 : 1,
    };

    const skip = (page - 1) * limit;

    const [fictions, total] = await Promise.all([
      this.database
        .collection<Fiction>(Constant.FICTION_COLLECTION)
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.database
        .collection<Fiction>(Constant.FICTION_COLLECTION)
        .countDocuments(query),
    ]);

    return { fictions, total };
  }

  async getFictionById(fictionId: string): Promise<Fiction | null> {
    return await this.database
      .collection<Fiction>(Constant.FICTION_COLLECTION)
      .findOne({ _id: new ObjectId(fictionId) });
  }

  async updateFiction(
    fictionId: string,
    updateData: Partial<Fiction>
  ): Promise<Fiction | null> {
    const result = await this.database
      .collection<Fiction>(Constant.FICTION_COLLECTION)
      .findOneAndUpdate(
        { _id: new ObjectId(fictionId) },
        { $set: { ...updateData, updatedAt: new Date() } },
        { returnDocument: "after" }
      );

    return result || null;
  }

  async deleteFiction(fictionId: string): Promise<boolean> {
    const result = await this.database
      .collection<Fiction>(Constant.FICTION_COLLECTION)
      .deleteOne({ _id: new ObjectId(fictionId) });

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
    if (!fiction) throw new Error("Không tìm thấy truyện");

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
}
