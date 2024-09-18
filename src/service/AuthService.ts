import { Db, ObjectId } from "mongodb";
import { Action, Resource } from "../util/Enum";
import { User } from "../model/Entity";

export class AuthService {
  private database: Db;
  private userId: string;

  constructor(database: Db, userId: string) {
    this.database = database;
    this.userId = userId;
  }

  public async getUser() {
    const user = await this.database
      .collection("users")
      .findOne({ _id: new ObjectId(this.userId) });

    return user;
  }

  public async managerHasPermission(
    resource: Resource,
    action: Action
  ): Promise<boolean> {
    if (!this.database || !this.userId) {
      throw new Error("Database or UserId not initialized");
    }

    const result = await this.database
      .collection("users")
      .aggregate([
        { $match: { _id: new ObjectId(this.userId) } },
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
