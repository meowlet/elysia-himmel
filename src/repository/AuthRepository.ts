import { Db, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { Constant } from "../util/Constant";
import { User } from "../model/Entity";
import { AuthService } from "../service/AuthService";
import { AuthorizationError, ConflictError } from "../util/Error";
import { AuthorizationErrorType } from "../util/Enum";

export class AuthRepository {
  private database: Db;

  constructor(database: Db) {
    this.database = database;
  }

  public async signUp(
    username: string,
    email: string,
    password: string
  ): Promise<void> {
    const newUser: User = {
      username: username,
      email: email,
      passwordHash: await Bun.password.hash(password, {
        algorithm: "bcrypt",
        cost: Constant.SALT,
      }),
      isPremium: false,
      premiumExpiryDate: undefined,
      favoriteTags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      bio: undefined,
    };
    await this.database
      .collection(Constant.USER_COLLECTION)
      .insertOne(newUser)
      .catch((err) => {
        if (err.code === 11000) {
          throw new ConflictError("User already exists");
        }
      });
  }

  public async signIn(identifier: string, password: string): Promise<User> {
    const existingUser = await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .findOne({
        $or: [{ username: identifier }, { email: identifier }],
      });

    if (!existingUser) {
      throw new AuthorizationError(
        "User not found",
        AuthorizationErrorType.USER_NOT_FOUND
      );
    }

    const isPasswordCorrect = await Bun.password.verify(
      password,
      existingUser.passwordHash
    );

    if (!isPasswordCorrect) {
      throw new AuthorizationError(
        "Password does not match",
        AuthorizationErrorType.INVALID_CREDENTIALS
      );
    }
    return existingUser;
  }

  public async checkUserExists(userId: string): Promise<boolean> {
    const user = await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .findOne({
        _id: new ObjectId(userId),
      });

    return !!user;
  }

  public async updateRefreshToken(userId: string, refreshToken: string) {
    await this.database.collection<User>(Constant.USER_COLLECTION).updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          data: {
            refreshToken: refreshToken,
          },
        },
      }
    );
  }
  async removeRefreshToken(userId: string) {
    console.log(userId);
    await this.database.collection<User>(Constant.USER_COLLECTION).updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          data: {
            refreshToken: null,
          },
        },
      }
    );
  }
}

// async function hashPassword(password: string): Promise<string> {
//   const salt = await bcrypt.genSalt(Constant.SALT);
//   return bcrypt.hash(password, salt);
// }

// async function comparePassword(
//   password: string,
//   hash: string
// ): Promise<boolean> {
//   return bcrypt.compare(password, hash);
// }
