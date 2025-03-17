import { Db, ObjectId } from "mongodb";
import { database } from "../database/Database";
import { Constant } from "../util/Constant";
import { Fiction, Tag } from "../model/Entity";
import { NotFoundError } from "elysia";
import { AuthService } from "../service/AuthService";
import { Action, Resource } from "../util/Enum";
import { ForbiddenError } from "../util/Error";
import { QueryTagParams } from "../model/Query";

export class TagRepository {
  private database: Db;
  private authService: AuthService;

  constructor(private userId: string) {
    this.database = database;
    this.authService = new AuthService(this.database, this.userId);
  }

  async getAllTags(params?: QueryTagParams): Promise<{
    tags: Tag[];
    total: number;
  }> {
    const {
      query,
      sortBy = "createdAt",
      sortOrder = "desc",
      page,
      limit,
    } = params || {};

    const filter: any = { isDeleted: { $ne: true } };

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: "i" } },
        { code: { $regex: query, $options: "i" } },
      ];
    }

    const sort: { [key: string]: 1 | -1 } = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    let aggregation = this.database
      .collection<Tag>(Constant.TAG_COLLECTION)
      .find(filter)
      .sort(sort);

    if (page && limit) {
      const skip = (page - 1) * parseInt(String(limit));
      aggregation = aggregation.skip(skip).limit(parseInt(String(limit)));
    }

    const [tags, total] = await Promise.all([
      aggregation.toArray(),
      this.database
        .collection<Tag>(Constant.TAG_COLLECTION)
        .countDocuments(filter),
    ]);

    return { tags, total };
  }

  async getFictionsByTagCode(tagCode: string): Promise<{
    tag: Tag;
    fictions: Fiction[];
  }> {
    const tag = await this.database
      .collection<Tag>(Constant.TAG_COLLECTION)
      .findOne({ code: tagCode, isDeleted: { $ne: true } });

    if (!tag) {
      throw new NotFoundError("Tag not found");
    }

    const fictions = await this.database
      .collection<Fiction>(Constant.FICTION_COLLECTION)
      .find({ tags: tag._id })
      .toArray();

    return { tag, fictions };
  }

  async createTag(tagData: Partial<Tag>): Promise<Tag> {
    const hasPermission = await this.authService.hasPermission(
      Resource.TAG,
      Action.CREATE
    );
    if (!hasPermission) {
      throw new ForbiddenError("You don't have permission to create tags");
    }

    // Kiểm tra trùng lặp code
    const existingTag = await this.database
      .collection<Tag>(Constant.TAG_COLLECTION)
      .findOne({
        code: tagData.code,
        isDeleted: { $ne: true },
      });

    if (existingTag) {
      throw new Error("Tag code already exists");
    }

    const newTag: Tag = {
      name: "",
      code: "",
      description: "",
      workCount: 0,
      ...tagData,
      isDeleted: false,
    };

    const result = await this.database
      .collection<Tag>(Constant.TAG_COLLECTION)
      .insertOne(newTag);

    if (!result.acknowledged) {
      throw new Error("Failed to create tag");
    }

    return newTag;
  }

  async updateTag(tagId: string, updateData: Partial<Tag>): Promise<Tag> {
    const hasPermission = await this.authService.hasPermission(
      Resource.TAG,
      Action.UPDATE
    );
    if (!hasPermission) {
      throw new ForbiddenError("You don't have permission to update tags");
    }

    // Kiểm tra tag tồn tại
    const existingTag = await this.database
      .collection<Tag>(Constant.TAG_COLLECTION)
      .findOne({ _id: new ObjectId(tagId), isDeleted: { $ne: true } });

    if (!existingTag) {
      throw new NotFoundError("Tag not found");
    }

    // Kiểm tra code trùng lặp nếu cập nhật code
    if (updateData.code) {
      const duplicateTag = await this.database
        .collection<Tag>(Constant.TAG_COLLECTION)
        .findOne({
          code: updateData.code,
          _id: { $ne: new ObjectId(tagId) },
          isDeleted: { $ne: true },
        });

      if (duplicateTag) {
        throw new Error("Tag code already exists");
      }
    }

    const result = await this.database
      .collection<Tag>(Constant.TAG_COLLECTION)
      .findOneAndUpdate(
        { _id: new ObjectId(tagId), isDeleted: { $ne: true } },
        {
          $set: {
            ...updateData,
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after" }
      );

    if (!result) {
      throw new NotFoundError("Tag not found");
    }

    return result;
  }

  async deleteTag(tagId: string): Promise<void> {
    const hasPermission = await this.authService.hasPermission(
      Resource.TAG,
      Action.DELETE
    );
    if (!hasPermission) {
      throw new ForbiddenError("You don't have permission to delete tags");
    }

    const result = await this.database
      .collection<Tag>(Constant.TAG_COLLECTION)
      .updateOne(
        { _id: new ObjectId(tagId), isDeleted: { $ne: true } },
        {
          $set: {
            isDeleted: true,
            updatedAt: new Date(),
          },
        }
      );

    if (result.matchedCount === 0) {
      throw new NotFoundError("Tag not found");
    }
  }

  async updateTagWorkCount(tagId: ObjectId, increment: number) {
    await this.database
      .collection<Tag>(Constant.TAG_COLLECTION)
      .updateOne({ _id: tagId }, { $inc: { workCount: increment } });
  }
}
