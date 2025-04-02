import { Db, ObjectId, WithId } from "mongodb";
import {
  AuthorApplicationStatus,
  Fiction,
  PaymentStatus,
  TransactionType,
  User,
} from "../model/Entity";
import { Constant } from "../util/Constant";
import { AuthorizationError } from "../util/Error";
import { Action, AuthorizationErrorType, Resource } from "../util/Enum";
import { PremiumDuration } from "../model/MeModel";
import { calculatePremiumExpiryDate } from "../util/DateHelper";
import { join } from "path";
import sharp from "sharp";
import { AuthService } from "../service/AuthService";
import { StorageService } from "../service/StorageService";
import EmailService from "../service/EmailService";
import { PaymentService, PremiumOrderInfo } from "../service/PaymentService";
import { GuestTokenRepository } from "./GuestTokenRepository";
import {
  PaymentFactory,
  PaymentMethod,
} from "../service/payment/PaymentFactory";
import { AuthorApplicationContext } from "../model/state/AuthorApplicationContext";

export interface Command<T = any> {
  execute(): Promise<T>;
}

export class GetCurrentUserCommand implements Command<WithId<User>> {
  constructor(private db: Db, private userId: string) {}

  async execute(): Promise<WithId<User>> {
    const currentUser = await this.db
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
}

export class IsUserAdminCommand implements Command<boolean> {
  constructor(private authService: AuthService) {}

  async execute(): Promise<boolean> {
    return (
      (await this.authService.hasPermission(Resource.USER, Action.UPDATE)) ||
      (await this.authService.hasPermission(Resource.FICTION, Action.UPDATE))
    );
  }
}

export class UpdateUserCommand implements Command<any> {
  constructor(private db: Db, private user: WithId<User>) {}

  async execute() {
    return await this.db
      .collection<User>(Constant.USER_COLLECTION)
      .updateOne({ _id: new ObjectId(this.user._id) }, { $set: this.user });
  }
}

export class RemoveRefreshTokenCommand implements Command<void> {
  constructor(private db: Db, private userId: string) {}

  async execute(): Promise<void> {
    await this.db.collection<User>(Constant.USER_COLLECTION).updateOne(
      { _id: new ObjectId(this.userId) },
      {
        $set: {
          "data.refreshToken": null,
        },
      }
    );
  }
}

export class UpdatePremiumStatusCommand implements Command<void> {
  constructor(
    private db: Db,
    private userId: string,
    private isPremium: boolean
  ) {}

  async execute(): Promise<void> {
    await this.db.collection<User>(Constant.USER_COLLECTION).updateOne(
      { _id: new ObjectId(this.userId) },
      {
        $set: {
          isPremium: this.isPremium,
          premiumUpdatedAt: new Date(),
        },
      }
    );
  }
}

export class AlterPasswordCommand implements Command<void> {
  constructor(
    private db: Db,
    private userId: string,
    private currentPassword: string,
    private newPassword: string,
    private emailService: EmailService
  ) {}

  async execute(): Promise<void> {
    const getCurrentUserCommand = new GetCurrentUserCommand(
      this.db,
      this.userId
    );
    const user = await getCurrentUserCommand.execute();

    const isPasswordCorrect = await Bun.password.verify(
      this.currentPassword,
      user.passwordHash as string
    );

    if (!isPasswordCorrect) {
      throw new AuthorizationError(
        "Current password is incorrect",
        AuthorizationErrorType.INVALID_CREDENTIALS
      );
    }

    const newPasswordHash = await Bun.password.hash(this.newPassword, {
      algorithm: "bcrypt",
      cost: Constant.SALT,
    });

    await this.db
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
}

export class SaveAvatarCommand implements Command<string> {
  constructor(
    private userId: string,
    private avatar: File,
    private storageService: StorageService
  ) {}

  async execute(): Promise<string> {
    const buffer = await this.avatar.arrayBuffer();
    const jpegBuffer = await sharp(buffer).jpeg({ quality: 80 }).toBuffer();
    const path = join("users", this.userId, "avatar.jpeg");
    const file = new File([jpegBuffer], "avatar.jpeg", {
      type: "image/jpeg",
    });
    return await this.storageService.saveFile(file, path);
  }
}

export class ApplyForAuthorCommand implements Command<void> {
  constructor(private db: Db, private userId: string, private notes?: string) {}

  async execute(): Promise<void> {
    const getCurrentUserCommand = new GetCurrentUserCommand(
      this.db,
      this.userId
    );
    const user = await getCurrentUserCommand.execute();

    const applicationContext = new AuthorApplicationContext(
      this.db,
      this.userId,
      user.authorApplicationStatus
    );

    await applicationContext.apply(this.notes);
  }
}

export class CancelAuthorApplicationCommand implements Command<void> {
  constructor(private db: Db, private userId: string) {}

  async execute(): Promise<void> {
    const applicationContext = await AuthorApplicationContext.fromUserId(
      this.db,
      this.userId
    );

    await applicationContext.cancel();
  }
}

export class GetFavoriteFictionsCommand implements Command<any[]> {
  constructor(private db: Db, private userId: string) {}

  async execute(): Promise<any[]> {
    const getCurrentUserCommand = new GetCurrentUserCommand(
      this.db,
      this.userId
    );
    const currentUser = await getCurrentUserCommand.execute();

    if (!currentUser.favorites || currentUser.favorites.length === 0) {
      return [];
    }

    return await this.db
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
}

export class GetPremiumAmountCommand implements Command<string> {
  constructor(private duration: PremiumDuration) {}

  execute(): Promise<string> {
    const amounts = {
      [PremiumDuration.ONE_MONTH]: "5000",
      [PremiumDuration.THREE_MONTH]: "14000",
      [PremiumDuration.SIX_MONTH]: "26000",
      [PremiumDuration.ONE_YEAR]: "50000",
    };

    const amount = amounts[this.duration];
    if (!amount) {
      throw new Error("Invalid duration");
    }

    return Promise.resolve(amount);
  }
}

export class GetPaymentUrlCommand implements Command<string> {
  constructor(
    private userId: string,
    private duration: PremiumDuration,
    private paymentService: PaymentService
  ) {}

  async execute(): Promise<string> {
    const getPremiumAmountCommand = new GetPremiumAmountCommand(this.duration);
    const amount = await getPremiumAmountCommand.execute();

    const humanReadableDuration = {
      [PremiumDuration.ONE_MONTH]: "1 month",
      [PremiumDuration.THREE_MONTH]: "3 months",
      [PremiumDuration.SIX_MONTH]: "6 months",
      [PremiumDuration.ONE_YEAR]: "1 year",
    };

    const orderInfo: PremiumOrderInfo = {
      userId: this.userId,
      message: `Purchase ${humanReadableDuration[this.duration]} premium plan`,
      duration: this.duration,
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
          name: `${humanReadableDuration[this.duration]} premium subscription`,
          quantity: 1,
          price: Number(amount),
          currency: Constant.PAYMENT_CURRENCY,
          totalPrice: Number(amount),
        },
      ]
    );
  }
}

export class GetGuestPaymentUrlCommand implements Command<string> {
  constructor(
    private duration: PremiumDuration,
    private paymentService: PaymentService,
    private db: Db,
    private email?: string
  ) {}

  async execute(): Promise<string> {
    const getPremiumAmountCommand = new GetPremiumAmountCommand(this.duration);
    const amount = await getPremiumAmountCommand.execute();

    if (this.email) {
      const user = await this.db
        .collection(Constant.GUEST_TOKEN_COLLECTION)
        .findOne({ email: this.email });

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
      message: `Guest purchase ${
        humanReadableDuration[this.duration]
      } premium plan`,
      duration: this.duration,
      type: TransactionType.GUEST_PREMIUM_SUBSCRIPTION,
      email: this.email,
    };

    return await this.paymentService.createGuestPremiumPayment(
      amount,
      orderInfo,
      {
        lang: "en",
      },
      [
        {
          name: `${humanReadableDuration[this.duration]} premium subscription`,
          quantity: 1,
          price: Number(amount),
          currency: Constant.PAYMENT_CURRENCY,
          totalPrice: Number(amount),
        },
      ]
    );
  }
}

export class HandleGuestPremiumPaymentCommand
  implements Command<{ token: string; expiryDate: Date }>
{
  constructor(
    private orderId: string,
    private paymentService: PaymentService,
    private db: Db,
    private emailService: EmailService
  ) {}

  async execute(): Promise<{ token: string; expiryDate: Date }> {
    await this.paymentService.updateTransactionStatus(
      this.orderId,
      PaymentStatus.SUCCESS
    );

    const transaction = await this.db
      .collection(Constant.TRANSACTION_COLLECTION)
      .findOne({ orderId: this.orderId });

    if (
      !transaction ||
      transaction.type !== TransactionType.GUEST_PREMIUM_SUBSCRIPTION
    ) {
      throw new Error("Invalid transaction");
    }

    const expiryDate = calculatePremiumExpiryDate(transaction.premiumDuration);

    const guestTokenRepository = new GuestTokenRepository();
    const token = await guestTokenRepository.createGuestToken(expiryDate);

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

    return { token, expiryDate };
  }
}

export class GetPaymentUrlWithMethodCommand implements Command<string> {
  constructor(
    private userId: string,
    private duration: PremiumDuration,
    private paymentService: PaymentService,
    private paymentMethod: PaymentMethod
  ) {}

  async execute(): Promise<string> {
    const getPremiumAmountCommand = new GetPremiumAmountCommand(this.duration);
    const amount = await getPremiumAmountCommand.execute();

    const humanReadableDuration = {
      [PremiumDuration.ONE_MONTH]: "1 month",
      [PremiumDuration.THREE_MONTH]: "3 months",
      [PremiumDuration.SIX_MONTH]: "6 months",
      [PremiumDuration.ONE_YEAR]: "1 year",
    };

    const orderInfo: PremiumOrderInfo = {
      userId: this.userId,
      message: `Purchase ${humanReadableDuration[this.duration]} premium plan`,
      duration: this.duration,
      type: TransactionType.PREMIUM_SUBSCRIPTION,
    };

    const paymentProvider = PaymentFactory.createPaymentProvider(
      this.paymentMethod,
      this.paymentService
    );

    return await paymentProvider.createPayment(
      amount,
      orderInfo,
      {
        lang: "en",
      },
      [
        {
          name: `${humanReadableDuration[this.duration]} premium subscription`,
          quantity: 1,
          price: Number(amount),
          currency: Constant.PAYMENT_CURRENCY,
          totalPrice: Number(amount),
        },
      ]
    );
  }
}
