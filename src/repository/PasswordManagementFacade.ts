import { ObjectId } from "mongodb";
import { database } from "../database/Database";
import { User } from "../model/Entity";
import { Constant } from "../util/Constant";
import { AuthorizationError } from "../util/Error";
import { AuthorizationErrorType } from "../util/Enum";
import EmailService from "../service/EmailService";

export class PasswordManagementFacade {
  private userFinder: UserFinder;
  private passwordVerifier: PasswordVerifier;
  private passwordHasher: PasswordHasher;
  private userUpdater: UserUpdater;
  private emailNotifier: EmailNotifier;

  constructor() {
    this.userFinder = new UserFinder();
    this.passwordVerifier = new PasswordVerifier();
    this.passwordHasher = new PasswordHasher();
    this.userUpdater = new UserUpdater();
    this.emailNotifier = new EmailNotifier();
  }

  public async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.userFinder.findUserById(userId);

    await this.passwordVerifier.verify(currentPassword, user.passwordHash!);

    const newPasswordHash = await this.passwordHasher.hash(newPassword);

    await this.userUpdater.updatePassword(userId, newPasswordHash);

    await this.emailNotifier.sendPasswordChangedEmail(user.email);
  }
}

class UserFinder {
  public async findUserById(userId: string): Promise<User> {
    const user = await database
      .collection<User>(Constant.USER_COLLECTION)
      .findOne({ _id: new ObjectId(userId) });

    if (!user) {
      throw new AuthorizationError(
        "User not found",
        AuthorizationErrorType.INVALID_TOKEN
      );
    }

    return user;
  }
}

class PasswordVerifier {
  public async verify(password: string, hash: string): Promise<void> {
    const isPasswordCorrect = await Bun.password.verify(password, hash);

    if (!isPasswordCorrect) {
      throw new AuthorizationError(
        "Current password is incorrect",
        AuthorizationErrorType.INVALID_CREDENTIALS
      );
    }
  }
}

class PasswordHasher {
  public async hash(password: string): Promise<string> {
    return Bun.password.hash(password, {
      algorithm: "bcrypt",
      cost: Constant.SALT,
    });
  }
}

class UserUpdater {
  public async updatePassword(
    userId: string,
    passwordHash: string
  ): Promise<void> {
    await database
      .collection<User>(Constant.USER_COLLECTION)
      .updateOne(
        { _id: new ObjectId(userId) },
        { $set: { passwordHash: passwordHash, updatedAt: new Date() } }
      );
  }
}

class EmailNotifier {
  public async sendPasswordChangedEmail(email: string): Promise<void> {
    new EmailService().sendMail({
      from: "Meow <mercury.meowsica.me>",
      to: email,
      subject: "Password changed",
      text: "Your password has been changed.",
      html: "<p>Your password has been changed.</p>",
    });
  }
}
