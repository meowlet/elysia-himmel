import { Db, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { Constant } from "../util/Constant";
import { User } from "../model/Entity";
import { AuthService } from "../service/AuthService";
import { AuthorizationError, ConflictError } from "../util/Error";
import { AuthorizationErrorType, ConflictErrorType } from "../util/Enum";
import EmailService from "../service/EmailService";
import { randomBytes } from "crypto";

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
          throw new ConflictError(
            "User already exists",
            ConflictErrorType.DUPLICATE_ENTRY
          );
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

  public async alterUserPassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .findOne({ _id: new ObjectId(userId) });

    if (!user) {
      throw new AuthorizationError(
        "User not found",
        AuthorizationErrorType.USER_NOT_FOUND
      );
    }

    const isPasswordCorrect = await Bun.password.verify(
      currentPassword,
      user.passwordHash
    );

    if (!isPasswordCorrect) {
      throw new AuthorizationError(
        "Current password is incorrect",
        AuthorizationErrorType.INVALID_CREDENTIALS
      );
    }

    const newPasswordHash = await Bun.password.hash(newPassword, {
      algorithm: "bcrypt",
      cost: Constant.SALT,
    });

    await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .updateOne(
        { _id: new ObjectId(userId) },
        { $set: { passwordHash: newPasswordHash, updatedAt: new Date() } }
      );

    // Send email to user
    new EmailService().sendMail({
      from: "Meow <mercury.meowsica.me>",
      to: user.email,
      subject: "Password changed",
      text: "Your password has been changed.",
      html: "<p>Your password has been changed.</p>",
    });
  }

  public async createPasswordResetToken(email: string): Promise<void> {
    const user = await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .findOne({ email: email });

    if (!user) {
      throw new AuthorizationError(
        "User not found",
        AuthorizationErrorType.USER_NOT_FOUND
      );
    }

    const resetToken = randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    const resetUrl = `${Constant.FE_URL}/reset-password/${resetToken}`;

    await this.database.collection<User>(Constant.USER_COLLECTION).updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetToken: resetToken,
          passwordResetExpires: resetTokenExpiry,
        },
      }
    );

    new EmailService().sendMail({
      from: "Meow <mercury.meowsica.me>",
      to: email,
      subject: "Password Reset Request",
      text: `To reset your password, click on this link: ${resetUrl}`,
      html: `<p>To reset your password, click on this link: <a href="${resetUrl}">${resetUrl}</a></p>`,
    });
  }

  public async resetPassword(
    token: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() },
      });

    if (!user) {
      throw new AuthorizationError(
        "Invalid or expired password reset token",
        AuthorizationErrorType.INVALID_TOKEN
      );
    }

    const newPasswordHash = await Bun.password.hash(newPassword, {
      algorithm: "bcrypt",
      cost: Constant.SALT,
    });

    await this.database.collection<User>(Constant.USER_COLLECTION).updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: newPasswordHash,
          passwordResetToken: null,
          passwordResetExpires: null,
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
