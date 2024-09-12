import { Db, ObjectId, WithId } from "mongodb";
import { AuthService } from "../service/AuthService";
import { User } from "../model/Entity";
import { Constant } from "../util/Constant";
import { database } from "../database/Database";
import { AuthorizationError } from "../util/Error";
import { AuthorizationErrorType } from "../util/Enum";
import EmailService from "../service/EmailService";
import { StorageService } from "../service/StorageService";
import { join } from "path";

export class MeRepository {
  private database: Db;
  private authService: AuthService;

  constructor(userId: string) {
    this.database = database;
    this.authService = new AuthService(this.database, userId);
  }

  public async getAvatar(userId: string) {
    const storage = new StorageService();
    const path = join(userId, "avatar");
    return await storage.getFile(path);
  }

  public async saveAvatar(avatar: File) {
    const storage = new StorageService();
    const path = join(this.authService.userId, "avatar");
    await storage.saveFile(avatar, path, Constant.UPLOAD_DIRECTORY);
  }

  public async updateUser(user: WithId<User>) {
    return await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .updateOne({ _id: new ObjectId(user._id) }, { $set: user });
  }

  public async getCurrentUser() {
    const currentUser = await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .findOne({ _id: new ObjectId(this.authService.userId) });

    if (!currentUser) {
      throw new AuthorizationError(
        "User not found",
        AuthorizationErrorType.INVALID_TOKEN
      );
    }

    return currentUser;
  }
  public async alterPassword(
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
        AuthorizationErrorType.INVALID_TOKEN
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

  public async removeRefreshToken(userId: string) {
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
