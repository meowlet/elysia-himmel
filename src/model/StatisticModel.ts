import Elysia, { t } from "elysia";
import { GroupByOption } from "../repository/StatisticRepository";

export const StatisticModel = new Elysia().model({
  QueryStatisticParams: t.Object({
    from: t.Optional(t.String()), // filter by start date
    to: t.Optional(t.String()), // filter by end date
    groupBy: t.Optional(t.Enum(GroupByOption)),
  }),
});
