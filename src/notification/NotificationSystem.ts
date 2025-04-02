import { MongoDatabase } from "../database/Database";
import { Constant } from "../util/Constant";
import { ObjectId } from "mongodb";

export enum NotificationEventType {
  NEW_CHAPTER = "new_chapter",
  PAYMENT_COMPLETED = "payment_completed",
  COMMENT_RECEIVED = "comment_received",
  FICTION_APPROVED = "fiction_approved",
  AUTHOR_APPLICATION_APPROVED = "author_application_approved",
  RATING_RECEIVED = "rating_received",
}

export interface NotificationData {
  id?: string | ObjectId;
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  eventType: NotificationEventType;
  entityId?: string | ObjectId;
  additionalData?: Record<string, any>;
}

export interface NotificationObserver {
  update(data: NotificationData): Promise<void>;
}

export abstract class NotificationSubject {
  private observers: Map<string, NotificationObserver[]> = new Map();

  public attach(
    observer: NotificationObserver,
    eventTypes: NotificationEventType[]
  ): void {
    eventTypes.forEach((eventType) => {
      if (!this.observers.has(eventType)) {
        this.observers.set(eventType, []);
      }
      const observersForType = this.observers.get(eventType)!;
      if (!observersForType.includes(observer)) {
        observersForType.push(observer);
      }
    });
  }

  public detach(
    observer: NotificationObserver,
    eventTypes?: NotificationEventType[]
  ): void {
    const typesToRemove = eventTypes || Array.from(this.observers.keys());

    typesToRemove.forEach((eventType) => {
      if (this.observers.has(eventType)) {
        const observersForType = this.observers.get(eventType)!;
        const index = observersForType.indexOf(observer);
        if (index !== -1) {
          observersForType.splice(index, 1);
        }
      }
    });
  }

  protected async notify(
    eventType: NotificationEventType,
    data: NotificationData
  ): Promise<void> {
    if (this.observers.has(eventType)) {
      const observersForType = this.observers.get(eventType)!;
      const notificationPromises = observersForType.map((observer) =>
        observer.update(data)
      );
      await Promise.all(notificationPromises);
    }
  }
}

export class ApplicationNotificationSystem extends NotificationSubject {
  private static instance: ApplicationNotificationSystem;

  private constructor() {
    super();
  }

  public static getInstance(): ApplicationNotificationSystem {
    if (!ApplicationNotificationSystem.instance) {
      ApplicationNotificationSystem.instance =
        new ApplicationNotificationSystem();
    }
    return ApplicationNotificationSystem.instance;
  }

  public async notifyNewChapter(
    fictionId: string | ObjectId,
    fictionTitle: string,
    chapterId: string | ObjectId,
    chapterTitle: string,
    authorId: string | ObjectId
  ): Promise<void> {
    const notificationData: NotificationData = {
      title: "New Chapter Published",
      message: `A new chapter "${chapterTitle}" has been published for "${fictionTitle}"`,
      timestamp: Date.now(),
      isRead: false,
      eventType: NotificationEventType.NEW_CHAPTER,
      entityId: chapterId.toString(),
      additionalData: {
        fictionId: fictionId.toString(),
        authorId: authorId.toString(),
        chapterTitle,
        fictionTitle,
      },
    };

    await this.notify(NotificationEventType.NEW_CHAPTER, notificationData);
  }

  public async notifyPaymentCompleted(
    userId: string | ObjectId,
    amount: number,
    orderId: string,
    transactionId: string
  ): Promise<void> {
    const notificationData: NotificationData = {
      title: "Payment Completed",
      message: `Your payment of ${amount} ${Constant.PAYMENT_CURRENCY} has been processed successfully.`,
      timestamp: Date.now(),
      isRead: false,
      eventType: NotificationEventType.PAYMENT_COMPLETED,
      entityId: transactionId,
      additionalData: {
        userId: userId.toString(),
        amount,
        orderId,
        currency: Constant.PAYMENT_CURRENCY,
      },
    };

    await this.notify(
      NotificationEventType.PAYMENT_COMPLETED,
      notificationData
    );
  }

  public async notifyCommentReceived(
    recipientId: string | ObjectId,
    commenterId: string | ObjectId,
    commenterName: string,
    fictionId: string | ObjectId,
    fictionTitle: string,
    commentId: string | ObjectId,
    commentText: string
  ): Promise<void> {
    const notificationData: NotificationData = {
      title: "New Comment Received",
      message: `${commenterName} commented on your fiction "${fictionTitle}"`,
      timestamp: Date.now(),
      isRead: false,
      eventType: NotificationEventType.COMMENT_RECEIVED,
      entityId: commentId.toString(),
      additionalData: {
        recipientId: recipientId.toString(),
        commenterId: commenterId.toString(),
        commenterName,
        fictionId: fictionId.toString(),
        fictionTitle,
        commentText,
      },
    };

    await this.notify(NotificationEventType.COMMENT_RECEIVED, notificationData);
  }

  public async notifyFictionApproved(
    authorId: string | ObjectId,
    fictionId: string | ObjectId,
    fictionTitle: string
  ): Promise<void> {
    const notificationData: NotificationData = {
      title: "Fiction Approved",
      message: `Your fiction "${fictionTitle}" has been approved and published.`,
      timestamp: Date.now(),
      isRead: false,
      eventType: NotificationEventType.FICTION_APPROVED,
      entityId: fictionId.toString(),
      additionalData: {
        authorId: authorId.toString(),
        fictionTitle,
      },
    };

    await this.notify(NotificationEventType.FICTION_APPROVED, notificationData);
  }
}

export class DatabaseNotificationObserver implements NotificationObserver {
  private static instance: DatabaseNotificationObserver;
  private collectionName: string = "notifications";

  private constructor() {}

  public static getInstance(): DatabaseNotificationObserver {
    if (!DatabaseNotificationObserver.instance) {
      DatabaseNotificationObserver.instance =
        new DatabaseNotificationObserver();
    }
    return DatabaseNotificationObserver.instance;
  }

  public async update(data: NotificationData): Promise<void> {
    try {
      const database = MongoDatabase.getInstance().getDatabase();
      const collection = database.collection(this.collectionName);

      await collection.insertOne({
        ...data,
        _id: new ObjectId(),
        createdAt: new Date(),
      });

      console.log(`Notification saved to database: ${data.title}`);
    } catch (error) {
      console.error("Error saving notification to database:", error);
    }
  }
}

export class EmailNotificationObserver implements NotificationObserver {
  private static instance: EmailNotificationObserver;

  private constructor() {}

  public static getInstance(): EmailNotificationObserver {
    if (!EmailNotificationObserver.instance) {
      EmailNotificationObserver.instance = new EmailNotificationObserver();
    }
    return EmailNotificationObserver.instance;
  }

  public async update(data: NotificationData): Promise<void> {
    try {
      console.log(`Email notification would be sent: ${data.title}`);
      console.log(`Message: ${data.message}`);
      console.log(`Event type: ${data.eventType}`);

      await this.simulateEmailSending(data);
    } catch (error) {
      console.error("Error sending email notification:", error);
    }
  }

  private async simulateEmailSending(data: NotificationData): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    switch (data.eventType) {
      case NotificationEventType.NEW_CHAPTER:
        console.log(`Email about new chapter would be sent to subscribers`);
        break;

      case NotificationEventType.PAYMENT_COMPLETED:
        console.log(
          `Payment receipt would be sent to user: ${data.additionalData?.userId}`
        );
        break;

      default:
        console.log(`Generic email notification for event: ${data.eventType}`);
    }
  }
}

export class PushNotificationObserver implements NotificationObserver {
  private static instance: PushNotificationObserver;

  private constructor() {}

  public static getInstance(): PushNotificationObserver {
    if (!PushNotificationObserver.instance) {
      PushNotificationObserver.instance = new PushNotificationObserver();
    }
    return PushNotificationObserver.instance;
  }

  public async update(data: NotificationData): Promise<void> {
    try {
      console.log(`Push notification would be sent: ${data.title}`);
      console.log(`Message: ${data.message}`);

      await this.simulatePushNotification(data);
    } catch (error) {
      console.error("Error sending push notification:", error);
    }
  }

  private async simulatePushNotification(
    data: NotificationData
  ): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log(
      `Push notification payload: ${JSON.stringify({
        title: data.title,
        body: data.message,
        data: {
          eventType: data.eventType,
          entityId: data.entityId,
        },
      })}`
    );
  }
}
