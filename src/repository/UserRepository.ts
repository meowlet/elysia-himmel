import { Db, ObjectId } from "mongodb";
import { AuthService } from "../service/AuthService";
import { User } from "../model/Entity";
import { Constant } from "../util/Constant";

export class UserRepository {
  private authService: AuthService;
  private database: Db;

  constructor(authService: AuthService, database: Db) {
    this.authService = authService;
    this.database = database;
  }

  public async getCurrentUser() {
    return await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .findOne({ _id: new ObjectId(this.authService.userId) });
  }
}
