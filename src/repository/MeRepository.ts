import { Db, ObjectId, WithId } from "mongodb";
import { AuthService } from "../service/AuthService";
import {
  AuthorApplicationStatus,
  TransactionType,
  User,
} from "../model/Entity";
import { Constant } from "../util/Constant";
import { database } from "../database/Database";
import { AuthorizationError } from "../util/Error";
import { Action, AuthorizationErrorType, Resource } from "../util/Enum";
import EmailService from "../service/EmailService";
import { StorageService } from "../service/StorageService";
import { join } from "path";
import { ValidationError } from "elysia";
import { PremiumDuration } from "../model/MeModel";
import { PaymentService, PremiumOrderInfo } from "../service/PaymentService";
import sharp from "sharp";

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

  public async getPaymentUrl(duration: PremiumDuration): Promise<string> {
    const amount = this.getPremiumAmount(duration);

    const humanReadableDuration = {
      [PremiumDuration.ONE_MONTH]: "1 month",
      [PremiumDuration.THREE_MONTH]: "3 months",
      [PremiumDuration.SIX_MONTH]: "6 months",
      [PremiumDuration.ONE_YEAR]: "1 year",
    };

    const orderInfo: PremiumOrderInfo = {
      userId: this.userId,
      message: `Purchase ${humanReadableDuration[duration]} premium plan`,
      duration,
      type: TransactionType.PREMIUM_SUBSCRIPTION,
    };

    return await this.paymentService.createMoMoPayment(
      amount,
      orderInfo,
      {
        lang: "en",
      },
      [
        {
          name: "One month premium subscription",
          quantity: 1,
          price: Number(amount),
          currency: Constant.PAYMENT_CURRENCY,
          totalPrice: Number(amount),
        },
      ]
    );
  }

  private getPremiumAmount(duration: PremiumDuration): string {
    const amounts = {
      [PremiumDuration.ONE_MONTH]: "5000",
      [PremiumDuration.THREE_MONTH]: "14000",
      [PremiumDuration.SIX_MONTH]: "26000",
      [PremiumDuration.ONE_YEAR]: "50000",
    };
    return (
      amounts[duration] ||
      (() => {
        throw new Error("Invalid duration");
      })()
    );
  }

  public async saveAvatar(avatar: File): Promise<string> {
    const buffer = await avatar.arrayBuffer();
    const jpegBuffer = await sharp(buffer).jpeg({ quality: 80 }).toBuffer();
    const path = join("users", this.userId, "avatar.jpeg");
    const file = new File([jpegBuffer], "avatar.jpeg", {
      type: "image/jpeg",
    });
    return await this.storageService.saveFile(file, path);
  }

  public async updateUser(user: WithId<User>) {
    return await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .updateOne({ _id: new ObjectId(user._id) }, { $set: user });
  }

  public async isUserAdmin(): Promise<boolean> {
    return (
      (await this.authService.hasPermission(Resource.USER, Action.UPDATE)) ||
      (await this.authService.hasPermission(Resource.FICTION, Action.UPDATE))
    );
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
      user.passwordHash as string
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

  public async applyForAuthor(notes?: string): Promise<void> {
    const user = await this.getCurrentUser();

    // Kiểm tra xem user đã apply chưa
    if (
      user.authorApplicationStatus === AuthorApplicationStatus.APPROVED ||
      user.authorApplicationStatus === AuthorApplicationStatus.PENDING
    ) {
      throw new Error("You have already applied to become an author");
    }

    // Update user status
    await this.database.collection<User>(Constant.USER_COLLECTION).updateOne(
      { _id: new ObjectId(this.userId) },
      {
        $set: {
          authorApplicationStatus: AuthorApplicationStatus.PENDING,
          updatedAt: new Date(),
        },
      }
    );

    // Tạo application record
    await this.database
      .collection(Constant.AUTHOR_APPLICATION_COLLECTION)
      .insertOne({
        user: new ObjectId(this.userId),
        status: AuthorApplicationStatus.PENDING,
        applicationDate: new Date(),
        notes: notes,
      });
  }

  public async cancelAuthorApplication() {
    await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .updateOne(
        { _id: new ObjectId(this.userId) },
        { $unset: { authorApplicationStatus: 1 } }
      );

    await this.database
      .collection(Constant.AUTHOR_APPLICATION_COLLECTION)
      .deleteOne({ user: new ObjectId(this.userId) });
  }
}
