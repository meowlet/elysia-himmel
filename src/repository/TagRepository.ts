import { Db } from "mongodb";
import { database } from "../database/Database";
import { Constant } from "../util/Constant";
import { Fiction, Tag } from "../model/Entity";
import { NotFoundError } from "elysia";

export class TagRepository {
  private database: Db;

  constructor() {
    this.database = database;
  }

  async getAllTags(): Promise<Tag[]> {
    return await this.database
      .collection<Tag>(Constant.TAG_COLLECTION)
      .find()
      .toArray();
  }

  async getFictionsByTagCode(tagCode: string): Promise<{
    tag: Tag;
    fictions: Fiction[];
  }> {
    const tag = await this.database
      .collection<Tag>(Constant.TAG_COLLECTION)
      .findOne({ code: tagCode });

    if (!tag) {
      throw new NotFoundError("Tag not found");
    }

    const fictions = await this.database
      .collection<Fiction>(Constant.FICTION_COLLECTION)
      .find({ tags: tag._id })
      .toArray();

    return { tag, fictions };
  }
}
