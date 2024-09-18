import Elysia from "elysia";
import { AuthPlugin } from "../plugin/AuthPlugin";

import { createSuccessResponse } from "../model/Response";
import { FictionModel } from "../model/FictionModel";
import { FictionRepository } from "../repository/FictionRepository";

export const FictionController = new Elysia()
  .use(AuthPlugin)
  .use(FictionModel)
  .derive(({ userId }) => {
    return {
      repository: new FictionRepository(userId!),
    };
  })
  .post(
    "/create",
    async ({ body, repository }) => {
      const newFiction = await repository.createFiction(body);
      return createSuccessResponse("Fiction created successfully", newFiction);
    },
    {
      body: "CreateFictionBody",
    }
  )
  .get(
    "/query",
    async ({ query, repository }) => {
      const fictions = await repository.queryFictions(query);
      return createSuccessResponse("Fictions retrieved successfully", fictions);
    },
    {
      query: "QueryFictionParams",
    }
  );
