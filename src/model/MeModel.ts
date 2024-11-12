import Elysia, { t } from "elysia";

export enum PremiumDuration {
  ONE_MONTH = "ONE_MONTH",
  THREE_MONTH = "THREE_MONTH",
  SIX_MONTH = "SIX_MONTH",
  ONE_YEAR = "ONE_YEAR",
}

export const MeModel = new Elysia().model({
  ChangePasswordBody: t.Object({
    currentPassword: t.String(),
    newPassword: t.String({
      minLength: 8,
      maxLength: 32,
      pattern:
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
      error:
        "New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    }),
  }),
  UpdateProfileBody: t.Object({
    fullName: t.String(),
    email: t.String({
      format: "email",
      error: "Invalid email format",
    }),
    phoneNumber: t.String(),
  }),
  ChangeAvatarBody: t.Object({
    avatar: t.File({
      type: "image/png",
      maxSize: 1024 * 1024 * 1, // 1MB
      error: "The avatar must be a valid image and less than 1MB",
    }),
  }),
  PurchasePremiumBody: t.Object({
    duration: t.Enum(PremiumDuration, {
      error: "Invalid duration",
    }),
  }),
  ApplyAuthorBody: t.Object({
    notes: t.Optional(
      t.String({
        minLength: 1,
        maxLength: 1000,
        error: "Notes must be between 1-1000 characters",
      })
    ),
  }),
});
