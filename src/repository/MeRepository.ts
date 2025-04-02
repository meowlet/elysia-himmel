import { Db, ObjectId, WithId } from "mongodb";
import { AuthService } from "../service/AuthService";
import { User } from "../model/Entity";
import { database } from "../database/Database";
import { PremiumDuration } from "../model/MeModel";
import { PaymentService } from "../service/PaymentService";
import EmailService from "../service/EmailService";
import { StorageService } from "../service/StorageService";
import {
  AlterPasswordCommand,
  ApplyForAuthorCommand,
  CancelAuthorApplicationCommand,
  GetCurrentUserCommand,
  GetFavoriteFictionsCommand,
  GetGuestPaymentUrlCommand,
  GetPaymentUrlCommand,
  GetPaymentUrlWithMethodCommand,
  GetPremiumAmountCommand,
  HandleGuestPremiumPaymentCommand,
  IsUserAdminCommand,
  RemoveRefreshTokenCommand,
  SaveAvatarCommand,
  UpdatePremiumStatusCommand,
  UpdateUserCommand,
} from "./MeCommands";
import {
  PaymentFactory,
  PaymentMethod,
} from "../service/payment/PaymentFactory";

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
    const command = new HandleGuestPremiumPaymentCommand(
      orderId,
      this.paymentService,
      this.database,
      this.emailService
    );
    return await command.execute();
  }

  async getGuestPaymentUrl(duration: PremiumDuration, email?: string) {
    const command = new GetGuestPaymentUrlCommand(
      duration,
      this.paymentService,
      this.database,
      email
    );
    return await command.execute();
  }

  public async getPaymentUrl(duration: PremiumDuration): Promise<string> {
    const command = new GetPaymentUrlCommand(
      this.userId,
      duration,
      this.paymentService
    );
    return await command.execute();
  }

  // Add a new method to get payment URL with specific payment method
  public async getPaymentUrlWithMethod(
    duration: PremiumDuration,
    paymentMethod: PaymentMethod = PaymentMethod.MOMO
  ): Promise<string> {
    const command = new GetPaymentUrlWithMethodCommand(
      this.userId,
      duration,
      this.paymentService,
      paymentMethod
    );
    return await command.execute();
  }

  // Add VNPAY-specific method for convenience
  public async getVNPayPaymentUrl(duration: PremiumDuration): Promise<string> {
    return this.getPaymentUrlWithMethod(duration, PaymentMethod.VNPAY);
  }

  private getPremiumAmount(duration: PremiumDuration): string {
    const command = new GetPremiumAmountCommand(duration);
    return command.execute() as unknown as string;
  }

  public async saveAvatar(avatar: File): Promise<string> {
    const command = new SaveAvatarCommand(
      this.userId,
      avatar,
      this.storageService
    );
    return await command.execute();
  }

  public async updateUser(user: WithId<User>) {
    const command = new UpdateUserCommand(this.database, user);
    return await command.execute();
  }

  public async isUserAdmin(): Promise<boolean> {
    const command = new IsUserAdminCommand(this.authService);
    return await command.execute();
  }

  public async getCurrentUser(): Promise<WithId<User>> {
    const command = new GetCurrentUserCommand(this.database, this.userId);
    return await command.execute();
  }

  public async alterPassword(
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const command = new AlterPasswordCommand(
      this.database,
      this.userId,
      currentPassword,
      newPassword,
      this.emailService
    );
    await command.execute();
  }

  public async removeRefreshToken() {
    const command = new RemoveRefreshTokenCommand(this.database, this.userId);
    await command.execute();
  }

  public async updatePremiumStatus(isPremium: boolean) {
    const command = new UpdatePremiumStatusCommand(
      this.database,
      this.userId,
      isPremium
    );
    await command.execute();
  }

  public async applyForAuthor(notes?: string): Promise<void> {
    const command = new ApplyForAuthorCommand(
      this.database,
      this.userId,
      notes
    );
    await command.execute();
  }

  public async getFavoriteFictions() {
    const command = new GetFavoriteFictionsCommand(this.database, this.userId);
    return await command.execute();
  }

  public async cancelAuthorApplication() {
    const command = new CancelAuthorApplicationCommand(
      this.database,
      this.userId
    );
    await command.execute();
  }
}
