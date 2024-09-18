import Elysia, { t } from "elysia";
import { SortField, SortOrder } from "../repository/FictionRepository";

export const FictionModel = new Elysia().model({
  CreateFictionBody: t.Object({
    title: t.String({ minLength: 1, error: "Title cannot be empty" }),
    description: t.String({
      minLength: 1,
      error: "Description cannot be empty",
    }),
  }),
  QueryFictionParams: t.Object({
    title: t.Optional(t.String()),
    authorId: t.Optional(t.String()),
    tags: t.Optional(t.Array(t.String())),
    sortBy: t.Enum(SortField),
    sortOrder: t.Enum(SortOrder),
    page: t.Optional(t.Number()),
    limit: t.Optional(t.Number()),
  }),
});

export interface QueryFictionParams {
  title?: string;
  authorId?: string;
  tags?: string[];
  sortBy?: SortField;
  sortOrder?: SortOrder;
  page?: number;
  limit?: number;
}
