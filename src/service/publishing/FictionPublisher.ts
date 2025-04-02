import { Fiction, FictionType } from "../../model/Entity";
import { FictionRepositoryProxy } from "../../repository/FictionRepositoryProxy";

export abstract class FictionPublisher {
  protected repository: FictionRepositoryProxy;

  constructor(userId: string) {
    this.repository = new FictionRepositoryProxy(userId);
  }

  async publishFiction(
    fiction: Partial<Fiction>,
    cover?: File
  ): Promise<Fiction> {
    this.validateFiction(fiction);

    const preparedFiction = await this.prepareFiction(fiction);

    const createdFiction = await this.createFiction(preparedFiction, cover);

    await this.postProcess(createdFiction);

    await this.sendNotifications(createdFiction);

    return createdFiction;
  }

  protected abstract validateFiction(fiction: Partial<Fiction>): void;
  protected abstract prepareFiction(
    fiction: Partial<Fiction>
  ): Promise<Partial<Fiction>>;

  protected async createFiction(
    fiction: Partial<Fiction>,
    cover?: File
  ): Promise<Fiction> {
    const result = await this.repository.createFiction(fiction, cover);
    return result;
  }

  protected async postProcess(fiction: Fiction): Promise<void> {}

  protected async sendNotifications(fiction: Fiction): Promise<void> {}
}
