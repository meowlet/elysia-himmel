import { Db, ObjectId } from "mongodb";
import { AuthorApplicationStatus, User } from "../Entity";
import { Constant } from "../../util/Constant";

export interface AuthorApplicationState {
  apply(db: Db, userId: string, notes?: string): Promise<void>;
  cancel(db: Db, userId: string): Promise<void>;
  approve(db: Db, userId: string, adminId: string): Promise<void>;
  reject(
    db: Db,
    userId: string,
    adminId: string,
    reason?: string
  ): Promise<void>;
  getStatus(): AuthorApplicationStatus | null;
}

export class NoApplicationState implements AuthorApplicationState {
  async apply(db: Db, userId: string, notes?: string): Promise<void> {
    await db.collection<User>(Constant.USER_COLLECTION).updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          authorApplicationStatus: AuthorApplicationStatus.PENDING,
          updatedAt: new Date(),
        },
      }
    );

    await db.collection(Constant.AUTHOR_APPLICATION_COLLECTION).insertOne({
      user: new ObjectId(userId),
      status: AuthorApplicationStatus.PENDING,
      applicationDate: new Date(),
      notes: notes,
    });
  }

  async cancel(db: Db, userId: string): Promise<void> {
    return Promise.resolve();
  }

  async approve(db: Db, userId: string, adminId: string): Promise<void> {
    throw new Error("No application to approve");
  }

  async reject(
    db: Db,
    userId: string,
    adminId: string,
    reason?: string
  ): Promise<void> {
    throw new Error("No application to reject");
  }

  getStatus(): AuthorApplicationStatus | null {
    return null;
  }
}

export class PendingApplicationState implements AuthorApplicationState {
  async apply(db: Db, userId: string, notes?: string): Promise<void> {
    throw new Error("Application already pending");
  }

  async cancel(db: Db, userId: string): Promise<void> {
    await db
      .collection<User>(Constant.USER_COLLECTION)
      .updateOne(
        { _id: new ObjectId(userId) },
        { $unset: { authorApplicationStatus: 1 } }
      );

    await db
      .collection(Constant.AUTHOR_APPLICATION_COLLECTION)
      .deleteOne({ user: new ObjectId(userId) });
  }

  async approve(db: Db, userId: string, adminId: string): Promise<void> {
    const now = new Date();

    await db.collection<User>(Constant.USER_COLLECTION).updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          authorApplicationStatus: AuthorApplicationStatus.APPROVED,
          updatedAt: now,
        },
      }
    );

    await db.collection(Constant.AUTHOR_APPLICATION_COLLECTION).updateOne(
      { user: new ObjectId(userId) },
      {
        $set: {
          status: AuthorApplicationStatus.APPROVED,
          reviewDate: now,
          reviewedBy: adminId,
        },
      }
    );
  }

  async reject(
    db: Db,
    userId: string,
    adminId: string,
    reason?: string
  ): Promise<void> {
    const now = new Date();

    await db.collection<User>(Constant.USER_COLLECTION).updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          authorApplicationStatus: AuthorApplicationStatus.REJECTED,
          updatedAt: now,
        },
      }
    );

    await db.collection(Constant.AUTHOR_APPLICATION_COLLECTION).updateOne(
      { user: new ObjectId(userId) },
      {
        $set: {
          status: AuthorApplicationStatus.REJECTED,
          reviewDate: now,
          reviewedBy: adminId,
          notes: reason || "",
        },
      }
    );
  }

  getStatus(): AuthorApplicationStatus {
    return AuthorApplicationStatus.PENDING;
  }
}

export class ApprovedApplicationState implements AuthorApplicationState {
  async apply(db: Db, userId: string, notes?: string): Promise<void> {
    throw new Error("Application already approved");
  }

  async cancel(db: Db, userId: string): Promise<void> {
    throw new Error("Cannot cancel approved application");
  }

  async approve(db: Db, userId: string, adminId: string): Promise<void> {
    return Promise.resolve();
  }

  async reject(
    db: Db,
    userId: string,
    adminId: string,
    reason?: string
  ): Promise<void> {
    throw new Error("Cannot reject approved application");
  }

  getStatus(): AuthorApplicationStatus {
    return AuthorApplicationStatus.APPROVED;
  }
}

export class RejectedApplicationState implements AuthorApplicationState {
  async apply(db: Db, userId: string, notes?: string): Promise<void> {
    const noApplicationState = new NoApplicationState();
    await noApplicationState.apply(db, userId, notes);
  }

  async cancel(db: Db, userId: string): Promise<void> {
    await db
      .collection<User>(Constant.USER_COLLECTION)
      .updateOne(
        { _id: new ObjectId(userId) },
        { $unset: { authorApplicationStatus: 1 } }
      );

    await db
      .collection(Constant.AUTHOR_APPLICATION_COLLECTION)
      .deleteOne({ user: new ObjectId(userId) });
  }

  async approve(db: Db, userId: string, adminId: string): Promise<void> {
    throw new Error("Cannot approve rejected application");
  }

  async reject(
    db: Db,
    userId: string,
    adminId: string,
    reason?: string
  ): Promise<void> {
    return Promise.resolve();
  }

  getStatus(): AuthorApplicationStatus {
    return AuthorApplicationStatus.REJECTED;
  }
}
