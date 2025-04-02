import { Db, ObjectId } from "mongodb";
import { AuthorApplicationStatus, User } from "../Entity";
import {
  ApprovedApplicationState,
  AuthorApplicationState,
  NoApplicationState,
  PendingApplicationState,
  RejectedApplicationState,
} from "./AuthorApplicationState";
import { Constant } from "../../util/Constant";

export class AuthorApplicationContext {
  private state: AuthorApplicationState;
  private db: Db;
  private userId: string;

  constructor(db: Db, userId: string, status?: AuthorApplicationStatus) {
    this.db = db;
    this.userId = userId;

    switch (status) {
      case AuthorApplicationStatus.PENDING:
        this.state = new PendingApplicationState();
        break;
      case AuthorApplicationStatus.APPROVED:
        this.state = new ApprovedApplicationState();
        break;
      case AuthorApplicationStatus.REJECTED:
        this.state = new RejectedApplicationState();
        break;
      default:
        this.state = new NoApplicationState();
    }
  }

  public static async fromUserId(
    db: Db,
    userId: string
  ): Promise<AuthorApplicationContext> {
    const user = await db
      .collection<User>(Constant.USER_COLLECTION)
      .findOne({ _id: new ObjectId(userId) });

    return new AuthorApplicationContext(
      db,
      userId,
      user?.authorApplicationStatus
    );
  }

  public async apply(notes?: string): Promise<void> {
    await this.state.apply(this.db, this.userId, notes);
    this.state = new PendingApplicationState();
  }

  public async cancel(): Promise<void> {
    await this.state.cancel(this.db, this.userId);
    this.state = new NoApplicationState();
  }

  public async approve(adminId: string): Promise<void> {
    await this.state.approve(this.db, this.userId, adminId);
    this.state = new ApprovedApplicationState();
  }

  public async reject(adminId: string, reason?: string): Promise<void> {
    await this.state.reject(this.db, this.userId, adminId, reason);
    this.state = new RejectedApplicationState();
  }

  public getStatus(): AuthorApplicationStatus | null {
    return this.state.getStatus();
  }
}
