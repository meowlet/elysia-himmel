import { Db, ObjectId } from "mongodb";
import { Action, Resource } from "../util/Enum";
import { User } from "../model/Entity";
import { NotFoundError } from "elysia";
import { Constant } from "../util/Constant";

export class AuthService {
  constructor(private database: Db, private userId: string) {}

  public async getUser() {
    const user = await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .findOne({ _id: new ObjectId(this.userId) });

    //check premium expired
    if (user?.premiumExpiryDate && user.premiumExpiryDate < new Date()) {
      console.log("premium expired");
      await this.database
        .collection<User>(Constant.USER_COLLECTION)
        .updateOne(
          { _id: new ObjectId(this.userId) },
          { $set: { isPremium: false } }
        );
    }

    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (user.role) {
      const userWithRole = await this.database
        .collection<User>(Constant.USER_COLLECTION)
        .aggregate([
          { $match: { _id: new ObjectId(this.userId) } },
          {
            $lookup: {
              from: Constant.ROLE_COLLECTION,
              localField: "role",
              foreignField: "_id",
              as: "role",
            },
          },
          { $unwind: "$role" },
        ])
        .toArray();

      return userWithRole[0];
    }

    return user;
  }

  public async hasPermission(
    resource: Resource,
    action: Action
  ): Promise<boolean> {
    if (!this.database || !this.userId) {
      throw new Error("Database or UserId not initialized");
    }

    const result = await this.database
      .collection(Constant.USER_COLLECTION)
      .aggregate([
        { $match: { _id: new ObjectId(this.userId) } },
        {
          $lookup: {
            from: Constant.ROLE_COLLECTION,
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
