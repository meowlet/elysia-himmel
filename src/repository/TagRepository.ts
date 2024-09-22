import { Db } from "mongodb";
import { database } from "../database/Database";
import { Constant } from "../util/Constant";
import { Tag } from "../model/Entity";

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
}
