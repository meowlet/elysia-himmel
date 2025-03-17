import Elysia, { t } from "elysia";
import { SortField, SortOrder } from "../repository/FictionRepository";
import { UserSortField } from "./Query";
import { AuthorApplicationStatus } from "./Entity";

export const UserModel = new Elysia().model({
  QueryUserParams: t.Object({
    query: t.Optional(t.String()),
    role: t.Optional(t.String()),
    isPremium: t.Optional(t.Boolean()),
    isAuthor: t.Optional(t.Boolean()),
    sortBy: t.Optional(t.Enum(UserSortField)),
    sortOrder: t.Optional(t.Enum(SortOrder)),
    page: t.Optional(t.Number({ minimum: 1 })),
    limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
  }),
  UserIdParams: t.Object({
    userId: t.String({
      pattern: "^[0-9a-fA-F]{24}$",
      error: "Invalid user ID",
    }),
  }),
  UpdateUserBody: t.Object({
    fullName: t.Optional(
      t.String({ minLength: 1, error: "Full name must not be empty" })
    ),
    email: t.Optional(
      t.String({
        format: "email",
        error: "Invalid email format",
      })
    ),
    username: t.Optional(
      t.String({
        minLength: 3,
        maxLength: 20,
        pattern: "^[a-zA-Z0-9_]+$",
        error:
          "Username must be 3-20 characters and can only contain letters, numbers and underscore",
      })
    ),
    role: t.Optional(t.Nullable(t.String())),
    isPremium: t.Optional(t.Boolean()),
    isActive: t.Optional(t.Boolean()),
    authorApplicationStatus: t.Optional(t.Enum(AuthorApplicationStatus)),
    premiumExpiryDate: t.Optional(t.Date()),
    bio: t.Optional(t.String()),
  }),
});
