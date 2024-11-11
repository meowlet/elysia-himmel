import { Db, ObjectId } from "mongodb";
import { AuthorApplicationStatus, User } from "../model/Entity";
import { Constant } from "../util/Constant";
import { database } from "../database/Database";
import { AuthService } from "../service/AuthService";
import { Action, Resource } from "../util/Enum";
import { ForbiddenError } from "../util/Error";
import { QueryUserParams, UserSortField } from "../model/Query";
import { SortField, SortOrder } from "./FictionRepository";
import { NotFoundError } from "elysia";

export class UserRepository {
  private database: Db;
  private authService: AuthService;

  constructor(private userId: string) {
    this.database = database;
    this.authService = new AuthService(this.database, this.userId);
  }
  setProfilePicture(userId: string, picture: File) {
    throw new Error("Method not implemented.");
  }

  public async deleteUser(userId: string) {
    // check permission
    const hasPermission = await this.authService.hasPermission(
      Resource.USER,
      Action.DELETE
    );
    if (!hasPermission) {
      throw new ForbiddenError("You are not allowed to delete this user");
    }
    return await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .deleteOne({ _id: new ObjectId(userId) });
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

  async queryUsers(params: QueryUserParams) {
    const {
      query,
      role,
      isPremium,
      isAuthor,
      sortBy = UserSortField.CREATED_AT,
      sortOrder = SortOrder.DESC,
      page = 1,
      limit = 12,
    } = params;

    const queryConditions: any = {};

    if (query) {
      queryConditions.$or = [
        { username: { $regex: query, $options: "i" } },
        { fullName: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ];
    }

    if (role) queryConditions.role = new ObjectId(role);
    if (isPremium !== undefined) queryConditions.isPremium = isPremium;
    if (isAuthor)
      queryConditions.authorApplicationStatus =
        AuthorApplicationStatus.APPROVED;

    let sort: { [key: string]: 1 | -1 } = {};
    sort[sortBy] = sortOrder === SortOrder.DESC ? -1 : 1;

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.database
        .collection<User>(Constant.USER_COLLECTION)
        .find(queryConditions)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.database
        .collection<User>(Constant.USER_COLLECTION)
        .countDocuments(queryConditions),
    ]);

    return { users, total };
  }

  async updateUser(
    userId: string,
    updateData: Partial<User>
  ): Promise<User | null> {
    // Check permission - chỉ admin mới có quyền update user
    const hasPermission = await this.authService.hasPermission(
      Resource.USER,
      Action.UPDATE
    );
    if (!hasPermission) {
      throw new ForbiddenError("You don't have permission to update users");
    }

    const user = await this.getUserById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Validate các trường dữ liệu đặc biệt
    if (updateData.username) {
      const existingUser = await this.database
        .collection<User>(Constant.USER_COLLECTION)
        .findOne({
          username: updateData.username,
          _id: { $ne: new ObjectId(userId) },
        });

      if (existingUser) {
        throw new Error("Username already exists");
      }
    }

    if (updateData.email) {
      const existingUser = await this.database
        .collection<User>(Constant.USER_COLLECTION)
        .findOne({
          email: updateData.email,
          _id: { $ne: new ObjectId(userId) },
        });

      if (existingUser) {
        throw new Error("Email already exists");
      }
    }

    if (updateData.bio) {
      updateData.bio = updateData.bio.trim();
    }

    console.log(updateData);

    // Xử lý các trường dữ liệu đặc biệt
    if (updateData.role === null) {
      console.log("role is null");
      await this.database
        .collection<User>(Constant.USER_COLLECTION)
        .updateOne({ _id: new ObjectId(userId) }, { $unset: { role: "" } });
      delete updateData.role;
    } else if (updateData.role) {
      updateData.role = new ObjectId(updateData.role);
    }

    if (updateData.authorApplicationStatus) {
      // Nếu approve author, tự động set role author
      if (
        updateData.authorApplicationStatus === AuthorApplicationStatus.APPROVED
      ) {
        const authorRole = await this.database
          .collection(Constant.ROLE_COLLECTION)
          .findOne({ name: "author" });

        if (authorRole) {
          updateData.role = authorRole._id;
        }
      }
    }

    // Xử lý premium expiry
    if (updateData.isPremium === false) {
      updateData.premiumExpiryDate = undefined;
    } else if (updateData.isPremium === true && !updateData.premiumExpiryDate) {
      // Nếu set premium mà không set expiry, mặc định là 1 tháng
      updateData.premiumExpiryDate = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      );
    }

    const result = await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .findOneAndUpdate(
        { _id: new ObjectId(userId) },
        {
          $set: {
            ...updateData,
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after" }
      );

    if (!result) throw new Error("Failed to update user");

    return result;
  }
}
