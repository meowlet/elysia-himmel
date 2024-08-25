import { Db } from "mongodb";
import bcrypt from "bcryptjs";
import { Constant } from "../util/Constant";

export class AuthRepository {
  private database: Db;

  constructor(db: Db) {
    this.database = db;
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
    await this.database.collection("users").insertOne(newUser);
  }
}

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(Constant.SALT);
  return bcrypt.hash(password, salt);
}
