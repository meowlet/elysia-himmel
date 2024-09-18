import Elysia, { error, t } from "elysia";
import { SortField, SortOrder } from "../repository/FictionRepository";
import { FictionStatus, FictionType } from "../model/Entity";

export const FictionModel = new Elysia().model({
  CreateFictionBody: t.Object({
    title: t.String({ minLength: 1, error: "Title must not be empty" }),
    description: t.String({
      minLength: 1,
      error: "Description must not be empty",
    }),
    tags: t.Array(t.String()),
    status: t.Enum(FictionStatus),
    type: t.Enum(FictionType),
  }),
  QueryFictionParams: t.Object({
    query: t.Optional(t.String()),
    author: t.Optional(t.String()),
    tags: t.Optional(
      t.Array(t.String(), {
        minItems: 1,
        uniqueItems: true,
        error: "Tags must not be empty and must be unique",
      })
    ),
    status: t.Optional(t.Enum(FictionStatus)),
    type: t.Optional(t.Enum(FictionType)),
    createdFrom: t.Optional(t.Nullable(t.Date())),
    createdTo: t.Optional(t.Nullable(t.Date())),
    sortBy: t.Optional(t.Enum(SortField)),
    sortOrder: t.Optional(t.Enum(SortOrder)),
    page: t.Optional(t.Number({ minimum: 1 })),
    limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
    minViewCount: t.Optional(t.Number({ minimum: 0 })),
    minRating: t.Optional(t.Number({ minimum: 0, maximum: 5 })),
  }),
  FictionIdParams: t.Object({
    fictionId: t.String({
      minLength: 24,
      maxLength: 24,
      error: "Fiction ID must be 24 characters long",
    }),
  }),
  UpdateFictionBody: t.Object({
    title: t.Optional(
      t.String({ minLength: 1, error: "Title must not be empty" })
    ),
    description: t.Optional(
      t.String({
        minLength: 1,
        error: "Description must not be empty",
      })
    ),
    tags: t.Optional(
      t.Array(t.String(), {
        minItems: 1,
        uniqueItems: true,
        error: "Tags must not be empty and must be unique",
      })
    ),
    status: t.Optional(t.Enum(FictionStatus)),
  }),
});
