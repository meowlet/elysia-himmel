import { Db } from "mongodb";
import bcrypt from "bcryptjs";
import { Constant } from "../util/Constant";
import { User } from "../model/Entity";
import { AuthService } from "../service/AuthService";
import { ConflictError } from "../util/Error";

export class AuthRepository {
  private database: Db;

  constructor(database: Db) {
    this.database = database;
  }

  public async signup(
    username: string,
    email: string,
    password: string
  ): Promise<void> {
    const newUser: User = {
      username: username,
      email: email,
      passwordHash: await hashPassword(password),
      isPremium: false,
      premiumExpiryDate: undefined,
      favoriteTags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      bio: undefined,
    };
    await this.database
      .collection("users")
      .insertOne(newUser)
      .catch((err) => {
        if (err.code === 11000) {
          throw new ConflictError("User already exists");
        }
      });
  }
}

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(Constant.SALT);
  return bcrypt.hash(password, salt);
}
