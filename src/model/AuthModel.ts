import Elysia, { t } from "elysia";

export const AuthModel = new Elysia().model({
  signIn: t.Object({
    identifier: t.String(),
    password: t.String(),
  }),
  signUp: t.Object({
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
});
