import Elysia, { t } from "elysia";

export const AuthModel = new Elysia().model({
  SignInBody: t.Object({
    identifier: t.String(),
    password: t.String(),
    rememberMe: t.Boolean({ default: false }),
  }),
  SignUpBody: t.Object({
    email: t.String({
      format: "email",
      error: "Invalid email format",
    }),
    username: t.String({
      minLength: 4,
      maxLength: 32,
      pattern: "^[a-zA-Z0-9_]+$",
      error: "Username must be alphanumeric and contain underscores only",
    }),
    password: t.String({
      minLength: 8,
      maxLength: 32,
      pattern:
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
      error:
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    }),
  }),
  GoogleAuthBody: t.Object({
    token: t.String(),
  }),
  SetUsernameBody: t.Object({
    userId: t.String(),
    username: t.String({
      minLength: 4,
      maxLength: 32,
      pattern: "^[a-zA-Z0-9_]+$",
      error: "Username must be alphanumeric and contain underscores only",
    }),
    fullName: t.Optional(
      t.String({
        minLength: 4,
        maxLength: 32,
        error: "Full name must be alphanumeric and contain underscores only",
      })
    ),
  }),
  ForgotPasswordBody: t.Object({
    email: t.String({
      format: "email",
      error: "Invalid email format",
    }),
  }),
  ResetPasswordBody: t.Object({
    newPassword: t.String({
      minLength: 8,
      maxLength: 32,
      pattern:
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
      error:
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    }),
  }),
});
