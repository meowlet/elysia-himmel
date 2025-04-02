import { FictionType } from "../../model/Entity";
import { FictionPublisher } from "./FictionPublisher";
import { FreeFictionPublisher } from "./FreeFictionPublisher";
import { PremiumFictionPublisher } from "./PremiumFictionPublisher";

export class FictionPublisherFactory {
  static getPublisher(type: FictionType, userId: string): FictionPublisher {
    switch (type) {
      case FictionType.FREE:
        return new FreeFictionPublisher(userId);
      case FictionType.PREMIUM:
        return new PremiumFictionPublisher(userId);
      default:
        throw new Error(`Unsupported fiction type: ${type}`);
    }
  }
}
