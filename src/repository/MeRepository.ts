import { Db, ObjectId, WithId } from "mongodb";
import { AuthService } from "../service/AuthService";
import {
  AuthorApplicationStatus,
  Fiction,
  PaymentStatus,
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
import { calculatePremiumExpiryDate } from "../util/DateHelper";
import { GuestTokenRepository } from "./GuestTokenRepository";

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

  async handleGuestPremiumPayment(orderId: string) {
    // Update transaction status
    await this.paymentService.updateTransactionStatus(
      orderId,
      PaymentStatus.SUCCESS
    );

    // Get transaction details
    const transaction = await this.database
      .collection(Constant.TRANSACTION_COLLECTION)
      .findOne({ orderId });

    if (
      !transaction ||
      transaction.type !== TransactionType.GUEST_PREMIUM_SUBSCRIPTION
    ) {
      throw new Error("Invalid transaction");
    }

    // Calculate premium expiry date
    const expiryDate = calculatePremiumExpiryDate(transaction.premiumDuration);

    // Create guest token
    const guestTokenRepository = new GuestTokenRepository();
    const token = await guestTokenRepository.createGuestToken(expiryDate);

    // If email provided, send token
    if (transaction.email) {
      this.emailService.sendMail({
        from: "Himmel <noreply@meowsica.me>",
        to: transaction.email,
        subject: "Your Premium Access Token",
        text: `Thank you for purchasing premium access! Your access token is: ${token}. You can use this token to access premium content until ${expiryDate.toLocaleString()}.`,
        html: `<p>Thank you for purchasing premium access!</p><p>Your access token is: <strong>${token}</strong></p><p>You can use this token to access premium content until ${expiryDate.toLocaleString()}.</p><p>To use your token, visit: <a href="${
          Constant.FE_URL
        }/premium/access?token=${token}">${
          Constant.FE_URL
        }/premium/access?token=${token}</a></p>`,
      });
    }

    // Return token in response
    return { token, expiryDate };
  }

  // Get payment URL for guest premium subscription
  async getGuestPaymentUrl(duration: PremiumDuration, email?: string) {
    const amount = this.getPremiumAmount(duration);

    if (email) {
      const user = await database
        .collection(Constant.GUEST_TOKEN_COLLECTION)
        .findOne({ email: email });
      if (user) {
        throw new Error(
          "This user already has an email address, if this is yours, please log in to use it."
        );
      }
    }

    const humanReadableDuration = {
      [PremiumDuration.ONE_MONTH]: "1 month",
      [PremiumDuration.THREE_MONTH]: "3 months",
      [PremiumDuration.SIX_MONTH]: "6 months",
      [PremiumDuration.ONE_YEAR]: "1 year",
    };

    const orderInfo = {
      userId: "guest",
      message: `Guest purchase ${humanReadableDuration[duration]} premium plan`,
      duration,
      type: TransactionType.GUEST_PREMIUM_SUBSCRIPTION,
      email,
    };

    const paymentUrl = await this.paymentService.createGuestPremiumPayment(
      amount,
      orderInfo,
      {
        lang: "en",
      },
      [
        {
          name: `${humanReadableDuration[duration]} premium subscription`,
          quantity: 1,
          price: Number(amount),
          currency: Constant.PAYMENT_CURRENCY,
          totalPrice: Number(amount),
        },
      ]
    );

    return paymentUrl;
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

  public async getFavoriteFictions() {
    const currentUser = await this.getCurrentUser();

    if (!currentUser.favorites || currentUser.favorites.length === 0) {
      return [];
    }

    return await this.database
      .collection<Fiction>(Constant.FICTION_COLLECTION)
      .aggregate([
        {
          $match: {
            _id: { $in: currentUser.favorites },
          },
        },
        {
          $lookup: {
            from: Constant.TAG_COLLECTION,
            let: { tagIds: "$tags" },
            pipeline: [
              {
                $match: {
                  $expr: { $in: ["$_id", "$$tagIds"] },
                  $or: [
                    { isDeleted: { $exists: false } },
                    { isDeleted: false },
                  ],
                },
              },
            ],
            as: "tags",
          },
        },
        {
          $lookup: {
            from: Constant.USER_COLLECTION,
            localField: "author",
            foreignField: "_id",
            as: "author",
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            description: 1,
            author: { $first: "$author" },
            tags: 1,
            status: 1,
            type: 1,
            stats: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ])
      .toArray();
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
