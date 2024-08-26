import { Db, ObjectId } from "mongodb";
import { Action, Resource } from "../util/Enum";

export class AuthService {
  set database(database: Db) {
    this.database = database;
  }

  set userId(userId: string) {
    this.userId = userId;
  }

  public async managerHasPermission(
    resource: Resource,
    action: Action
  ): Promise<boolean> {
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
