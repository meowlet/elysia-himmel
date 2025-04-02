import { Fiction, FictionStatus, FictionType } from "../../model/Entity";
import { FictionPublisher } from "./FictionPublisher";

export class FreeFictionPublisher extends FictionPublisher {
  protected validateFiction(fiction: Partial<Fiction>): void {
    if (!fiction.title || fiction.title.trim().length === 0) {
      throw new Error("Fiction title is required");
    }

    if (!fiction.description || fiction.description.trim().length === 0) {
      throw new Error("Fiction description is required");
    }

    if (!fiction.tags || fiction.tags.length === 0) {
      throw new Error("At least one tag is required");
    }
  }

  protected async prepareFiction(
    fiction: Partial<Fiction>
  ): Promise<Partial<Fiction>> {
    // Set specific properties for free fiction
    return {
      ...fiction,
      type: FictionType.FREE,
      status: fiction.status || FictionStatus.ONGOING,
    };
  }

  // We're using the default implementation for createFiction

  protected async postProcess(fiction: Fiction): Promise<void> {
    // For free fiction, maybe we want to add it to a "New Free Releases" list
    console.log(`Added "${fiction.title}" to new free releases list`);
  }

  protected async sendNotifications(fiction: Fiction): Promise<void> {
    // Notify followers about new free fiction
    console.log(
      `Sending notification about new free fiction: ${fiction.title}`
    );
    // In a real implementation, this would connect to a notification service
  }
}
