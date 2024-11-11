import Elysia from "elysia";
import { AuthPlugin } from "../plugin/AuthPlugin";
import { createSuccessResponse } from "../model/Response";
import { StatisticModel } from "../model/StatisticModel";
import { StatisticRepository } from "../repository/StatisticRepository";

export const StatisticController = new Elysia()
  .use(AuthPlugin)
  .use(StatisticModel)
  .derive(({ userId }) => {
    return {
      repository: new StatisticRepository(userId!),
    };
  })
  // Lấy thống kê tổng quan
  .get(
    "/general",
    async ({ query, repository }) => {
      const stats = await repository.getGeneralStatistics(query);
      return createSuccessResponse(
        "Get general statistics successfully",
        stats
      );
    },
    {
      query: "QueryStatisticParams",
    }
  )
  // Thống kê về fiction
  .get(
    "/fiction",
    async ({ query, repository }) => {
      const stats = await repository.getFictionStatistics(query);
      return createSuccessResponse(
        "Get fiction statistics successfully",
        stats
      );
    },
    {
      query: "QueryStatisticParams",
    }
  )
  .get(
    "/user",
    async ({ query, repository }) => {
      const stats = await repository.getUserStatistics(query);
      return createSuccessResponse("Get user statistics successfully", stats);
    },
    {
      query: "QueryStatisticParams",
    }
  );
