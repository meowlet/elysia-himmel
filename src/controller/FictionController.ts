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
    "/",
    async ({ query, repository }) => {
      const fictions = await repository.queryFictions(query);
      return createSuccessResponse("Fictions retrieved successfully", fictions);
    },
    {
      query: "QueryFictionParams",
    }
  )
  .get(
    "/:fictionId",
    async ({ params, repository }) => {
      const fiction = await repository.getFiction(params.fictionId);
      return createSuccessResponse("Fiction retrieved successfully", fiction);
    },
    {
      params: "FictionIdParams",
    }
  )
  .patch(
    "/:fictionId",
    async ({ params, body, repository }) => {
      const updatedFiction = await repository.updateFiction(
        params.fictionId,
        body
      );
      return createSuccessResponse(
        "Fiction updated successfully",
        updatedFiction
      );
    },
    {
      params: "FictionIdParams",
      body: "UpdateFictionBody",
    }
  );
