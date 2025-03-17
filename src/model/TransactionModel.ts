import Elysia, { t } from "elysia";
import {
  TransactionSortField,
  TransactionStatus,
} from "../repository/TransactionRepository";

export const TransactionModel = new Elysia().model({
  QueryTransactionParams: t.Object({
    status: t.Optional(
      t.Enum(TransactionStatus, {
        error: "Status must be success or not-success",
      })
    ),
    sortBy: t.Optional(
      t.Enum(TransactionSortField, {
        error: "Sort by must be amount or createdAt",
      })
    ),
    from: t.Optional(t.Nullable(t.Date())),
    to: t.Optional(t.Nullable(t.Date())),
    page: t.Optional(
      t.Number({ minimum: 1, error: "Page must be greater than 0" })
    ),
    limit: t.Optional(
      t.Number({
        minimum: 1,
        maximum: 100,
        error: "Limit must be between 1 and 100",
      })
    ),
  }),
});
