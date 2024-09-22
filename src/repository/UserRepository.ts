import { Db } from "mongodb";
import { User } from "../model/Entity";
import { Constant } from "../util/Constant";
import { database } from "../database/Database";

export class UserRepository {
  private database: Db;

  constructor() {
    this.database = database;
  }

  public async getAllUsers(): Promise<Partial<User>[]> {
    return await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .find({}, { projection: { passwordHash: 0 } })
      .toArray();
  }
}
