import { Db, ObjectId } from "mongodb";
import { Action, Resource } from "../util/Enum";

export class AuthService {
  private _database: Db | null;
  private _userId: string | null;

  constructor(database: Db, userId: string) {
    this._database = database;
    this._userId = userId;
  }

  set database(database: Db) {
    this._database = database;
  }

  get database(): Db {
    if (!this._database) {
      throw new Error("Database has not been initialized");
    }
    return this._database;
  }

  set userId(userId: string) {
    this._userId = userId;
  }

  get userId(): string {
    if (!this._userId) {
      throw new Error("UserId has not been set");
    }
    return this._userId;
  }

  public async managerHasPermission(
    resource: Resource,
    action: Action
  ): Promise<boolean> {
    if (!this._database || !this._userId) {
      throw new Error("Database or UserId not initialized");
    }

    const result = await this._database
      .collection("users")
      .aggregate([
        { $match: { _id: new ObjectId(this._userId) } },
        {
          $lookup: {
            from: "roles",
            localField: "role",
            foreignField: "_id",
            as: "role",
          },
        },
        { $unwind: "$role" },
        { $project: { "role.permissions": 1 } },
      ])
      .toArray();

    if (result.length === 0) {
      return false;
    }

    const permissions = result[0].role.permissions;
    return permissions.some(
      (permission: { resource: Resource; actions: Action[] }) =>
        permission.resource === resource && permission.actions.includes(action)
    );
  }

  public async userHasPermission(): Promise<boolean> {
    return true;
  }
}
