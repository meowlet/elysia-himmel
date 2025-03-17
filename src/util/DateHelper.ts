import { PremiumDuration } from "../model/MeModel";

export function calculatePremiumExpiryDate(duration: PremiumDuration): Date {
  const now = new Date();

  switch (duration) {
    case PremiumDuration.ONE_MONTH:
      return new Date(now.setMonth(now.getMonth() + 1));
    case PremiumDuration.THREE_MONTH:
      return new Date(now.setMonth(now.getMonth() + 3));
    case PremiumDuration.SIX_MONTH:
      return new Date(now.setMonth(now.getMonth() + 6));
    case PremiumDuration.ONE_YEAR:
      return new Date(now.setFullYear(now.getFullYear() + 1));
    default:
      throw new Error("Invalid duration");
  }
}
