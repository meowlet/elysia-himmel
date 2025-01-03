import Elysia, { NotFoundError, t } from "elysia";
import { AuthPlugin } from "../plugin/AuthPlugin";

import { join } from "path";
import { createErrorResponse, createSuccessResponse } from "../model/Response";
import { FictionModel } from "../model/FictionModel";
import { FictionRepository } from "../repository/FictionRepository";
import { ChapterController } from "./ChapterController";
import { ChapterModel } from "../model/ChapterModel";

export const FictionController = new Elysia()
  .use(FictionModel)
  .use(ChapterModel)
  .derive(async () => {
    return {
      repository: new FictionRepository(""),
    };
  })
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
    "/random",
    async ({ query, repository }) => {
      const fictions = await repository.getRandomFictions(query.limit || 10);
      return createSuccessResponse(
        "Random fictions retrieved successfully",
        fictions
      );
    },
    {
      query: t.Object({
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
      }),
    }
  )
  .get(
    "/:fictionId/chapter/:chapterId/:pageIndex",
    async ({ params }) => {
      const path = join(
        "public",
        "fictions",
        params.fictionId,
        "chapters",
        params.chapterId,
        params.pageIndex + ".jpeg"
      );

      const file = Bun.file(path);

      if (!(await file.exists())) {
        throw new NotFoundError("Chapter page not found");
      }

      return file;
    },
    {
      params: "ChapterPageParams",
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
  .get(
    "/:fictionId/cover",
    async ({ params }) => {
      const fictionCover = Bun.file(
        join("public", "fictions", params.fictionId, "cover.jpeg")
      );
      if (!(await fictionCover.exists())) {
        throw new NotFoundError("Fiction cover not found");
      }
      return fictionCover;
    },
    {
      params: "FictionIdParams",
    }
  )
  .use(ChapterController)
  .use(AuthPlugin)
  .derive(({ userId }) => {
    return {
      repository: new FictionRepository(userId!),
    };
  })
  .post(
    "/create",
    async ({ body, repository }) => {
      const { cover, ...fictionData } = body;
      const newFiction = await repository.createFiction(fictionData, cover);

      return createSuccessResponse("Fiction created successfully", newFiction);
    },
    {
      body: "CreateFictionBody",
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
  )
  .delete(
    "/:fictionId",
    async ({ params, repository }) => {
      const result = await repository.deleteFiction(params.fictionId);
      return createSuccessResponse("Fiction deleted successfully", result);
    },
    {
      params: "FictionIdParams",
    }
  )
  .post(
    "/:fictionId/cover",
    async ({ params, body, repository }) => {
      const coverUrl = await repository.uploadCover(
        params.fictionId,
        body.cover
      );
      return createSuccessResponse("Cover uploaded successfully", { coverUrl });
    },
    {
      params: "FictionIdParams",
      body: "UploadCoverBody",
    }
  )
  .post(
    "/:fictionId/favorite",
    async ({ params, repository }) => {
      const result = await repository.favoriteFiction(params.fictionId);
      return createSuccessResponse("Fiction favorited successfully", result);
    },
    {
      params: "FictionIdParams",
    }
  )
  .post(
    "/:fictionId/increment-view",
    async ({ params, repository }) => {
      await repository.incrementViewCount(params.fictionId);
      return createSuccessResponse("View count incremented successfully", null);
    },
    {
      params: "FictionIdParams",
    }
  );
