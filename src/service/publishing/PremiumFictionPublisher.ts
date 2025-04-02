import { Fiction, FictionStatus, FictionType } from "../../model/Entity";
import { FictionPublisher } from "./FictionPublisher";

export class PremiumFictionPublisher extends FictionPublisher {
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

    if (fiction.description.length < 100) {
      throw new Error(
        "Premium fiction requires a detailed description (at least 100 characters)"
      );
    }
  }

  protected async prepareFiction(
    fiction: Partial<Fiction>
  ): Promise<Partial<Fiction>> {
    return {
      ...fiction,
      type: FictionType.PREMIUM,
      status: fiction.status || FictionStatus.ONGOING,
    };
  }

  protected async postProcess(fiction: Fiction): Promise<void> {
    console.log(`Added "${fiction.title}" to premium featured list`);
  }

  protected async sendNotifications(fiction: Fiction): Promise<void> {
    console.log(`Sending premium release notification for: ${fiction.title}`);
  }
}
