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
    return {
      ...fiction,
      type: FictionType.FREE,
      status: fiction.status || FictionStatus.ONGOING,
    };
  }

  protected async postProcess(fiction: Fiction): Promise<void> {
    console.log(`Added "${fiction.title}" to new free releases list`);
  }

  protected async sendNotifications(fiction: Fiction): Promise<void> {
    console.log(
      `Sending notification about new free fiction: ${fiction.title}`
    );
  }
}
