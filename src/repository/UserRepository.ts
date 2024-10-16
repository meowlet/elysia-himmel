import { Db, ObjectId } from "mongodb";
import { User } from "../model/Entity";
import { Constant } from "../util/Constant";
import { database } from "../database/Database";

export class UserRepository {
  private database: Db;

  constructor() {
    this.database = database;
  }
  setProfilePicture(userId: string, picture: File) {
    throw new Error("Method not implemented.");
  }

  public async getAllUsers(): Promise<Partial<User>[]> {
    return await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .find({}, { projection: { passwordHash: 0 } })
      .toArray();
  }
  public async getUserById(userId: string) {
    return await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .findOne({ _id: new ObjectId(userId) });
  }
}
