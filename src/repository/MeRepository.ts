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
import { ValidationError } from "elysia";
import { Duration } from "../model/MeModel";
import { PaymentService } from "../service/PaymentService";

export class MeRepository {
  private database: Db;
  private paymentService: PaymentService;
  public authService: AuthService;
  private storageService: StorageService;
  private emailService: EmailService;

  constructor(private userId: string) {
    this.database = database;
    this.authService = new AuthService(this.database, this.userId);
    this.paymentService = new PaymentService();
    this.storageService = new StorageService();
    this.emailService = new EmailService();
  }

  public async purchasePremium(duration: Duration): Promise<{
    status: "success" | "error";
    paymentUrl?: string;
  }> {
    const user = await this.authService.getUser();

    const amount = this.getPremiumAmount(duration);

    const humanReadableDuration = {
      [Duration.ONE_MONTH]: "1 month",
      [Duration.THREE_MONTH]: "3 months",
      [Duration.SIX_MONTH]: "6 months",
      [Duration.ONE_YEAR]: "1 year",
    };

    const orderInfo = `Upgrade to Premium - ${humanReadableDuration[duration]}`;

    try {
      const paymentUrl = await this.paymentService.createMoMoPayment(
        amount,
        orderInfo
      );
      return { status: "success", paymentUrl };
    } catch (error) {
      console.error("Error creating payment request:", error);
      return { status: "error" };
    }
  }

  private getPremiumAmount(duration: Duration): string {
    const amounts = {
      [Duration.ONE_MONTH]: "5000",
      [Duration.THREE_MONTH]: "14000",
      [Duration.SIX_MONTH]: "26000",
      [Duration.ONE_YEAR]: "50000",
    };
    return (
      amounts[duration] ||
      (() => {
        throw new Error("Invalid duration");
      })()
    );
  }

  public async saveAvatar(avatar: File): Promise<string> {
    const path = join(this.userId, "avatar");
    return await this.storageService.saveFile(avatar, path);
  }

  public async updateUser(user: WithId<User>) {
    return await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .updateOne({ _id: new ObjectId(user._id) }, { $set: user });
  }

  public async getCurrentUser(): Promise<WithId<User>> {
    const currentUser = await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .findOne({ _id: new ObjectId(this.userId) });

    if (!currentUser) {
      throw new AuthorizationError(
        "User not found",
        AuthorizationErrorType.INVALID_TOKEN
      );
    }

    return currentUser;
  }

  public async alterPassword(
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.getCurrentUser();

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
        { _id: new ObjectId(this.userId) },
        { $set: { passwordHash: newPasswordHash, updatedAt: new Date() } }
      );

    await this.emailService.sendMail({
      from: "Meow <mercury.meowsica.me>",
      to: user.email,
      subject: "Password has been changed",
      text: "Your password has been changed.",
      html: "<p>Your password has been changed.</p>",
    });
  }

  public async removeRefreshToken() {
    await this.database.collection<User>(Constant.USER_COLLECTION).updateOne(
      { _id: new ObjectId(this.userId) },
      {
        $set: {
          "data.refreshToken": null,
        },
      }
    );
  }

  public async updatePremiumStatus(isPremium: boolean) {
    await this.database.collection<User>(Constant.USER_COLLECTION).updateOne(
      { _id: new ObjectId(this.userId) },
      {
        $set: {
          isPremium,
          premiumUpdatedAt: new Date(),
        },
      }
    );
  }
}
