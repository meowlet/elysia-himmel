import { randomBytes } from "crypto";
import { database } from "../database/Database";
import { Constant } from "../util/Constant";
import { Db } from "mongodb";
import EmailService from "../service/EmailService";

export class GuestTokenRepository {
  private database: Db;

  constructor() {
    this.database = database;
  }

  public async createGuestToken(premiumExpiryDate: Date): Promise<string> {
    // Generate a secure random token
    const token = randomBytes(32).toString("hex");

    await this.database.collection(Constant.GUEST_TOKEN_COLLECTION).insertOne({
      token,
      premiumExpiryDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return token;
  }

  public async validateGuestToken(token: string): Promise<boolean> {
    const guestToken = await this.database
      .collection(Constant.GUEST_TOKEN_COLLECTION)
      .findOne({
        token,
        expiryDate: { $gt: new Date() },
      });

    return !!guestToken;
  }

  public async getTokenExpiryDate(token: string): Promise<Date | null> {
    const guestToken = await this.database
      .collection(Constant.GUEST_TOKEN_COLLECTION)
      .findOne({ token });

    return guestToken ? guestToken.expiryDate : null;
  }

  public async resendGuestToken(email: string): Promise<void> {
    // Find the guest token by email
    const guestToken = await this.database
      .collection(Constant.GUEST_TOKEN_COLLECTION)
      .findOne({ email });

    const emailService = new EmailService();

    if (guestToken) {
      emailService.sendMail({
        from: "Himmel <noreply@meowsica.me>",
        to: email,
        subject: "Your Premium Access Token",
        text: `Thank you for purchasing premium access! Your access token is: ${
          guestToken.token
        }. You can use this token to access premium content until ${guestToken.expiryDate.toLocaleString()}.`,
        html: `<p>Thank you for purchasing premium access!</p><p>Your access token is: <strong>${
          guestToken.token
        }</strong></p><p>You can use this token to access premium content until ${guestToken.expiryDate.toLocaleString()}.</p><p>To use your token, visit: <a href="${
          Constant.FE_URL
        }/premium/access?token=${guestToken.token}">${
          Constant.FE_URL
        }/premium/access?token=${guestToken.token}</a></p>`,
      });
    }
  }
  // send email
}
