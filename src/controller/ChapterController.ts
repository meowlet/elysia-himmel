import Elysia, { NotFoundError } from "elysia";
import { ChapterModel } from "../model/ChapterModel";
import { ChapterRepository } from "../repository/ChapterRepository";
import { AuthPlugin } from "../plugin/AuthPlugin";
import { createSuccessResponse } from "../model/Response";
import { FictionType, User } from "../model/Entity";
import { join } from "path";
import { ForbiddenError } from "../util/Error";
import { ChapterServiceFactory } from "../service/chapter/ChapterService";

export const ChapterController = new Elysia()
  .use(ChapterModel)
  .derive(async () => {
    return {
      repository: new ChapterRepository(""),
    };
  })
  // get chapter data
  .get(
    "/chapter/:chapterId",
    async ({ params, repository }) => {
      const chapter = await repository.getChapter(params.chapterId);
      return createSuccessResponse("Chapter retrieved successfully", chapter);
    },
    {
      params: "ChapterIdParams",
    }
  )
  .use(AuthPlugin)
  .derive(async ({ userId }) => {
    const repository = new ChapterRepository(userId!);
    const user = await repository.authService.getUser();
    return {
      repository: repository,
      user: user,
    };
  })
  .post(
    "/:fictionId/chapter",
    async ({ params, body, repository }) => {
      const chapterIndex = Number(body.chapterIndex);

      const parsedBody = {
        ...body,
        chapterIndex: chapterIndex,
      };

      const newChapter = await repository.createChapter(
        params.fictionId,
        parsedBody,
        body.content
      );
      return createSuccessResponse("Chapter created successfully", newChapter);
    },
    {
      body: "CreateChapterBody",
    }
  )
  .post(
    "/chapter/:chapterId/bookmark",
    async ({ params, repository }) => {
      await repository.bookmarkChapter(params.chapterId);
      return createSuccessResponse("Chapter bookmarked successfully", null);
    },
    {
      params: "ChapterIdParams",
    }
  )
  // Unified chapter page access using the decorator pattern
  .get(
    "/:fictionId/chapter/:chapterId/:pageIndex",
    async ({ params, user, repository }) => {
      // First get the fiction to determine if it's premium
      const fiction = await repository.getFiction(params.fictionId);

      // Create the appropriate service using the factory
      const isPremium = fiction.type === FictionType.PREMIUM;
      const chapterService = ChapterServiceFactory.createChapterService(
        isPremium,
        user as User
      );

      // Use the service to get the chapter page
      const file = await chapterService.getChapterPage(
        params.fictionId,
        params.chapterId,
        Number(params.pageIndex)
      );

      return file;
    },
    {
      params: "ChapterPageParams",
    }
  )
  // Keep the premium chapter endpoint for backward compatibility
  .get(
    "/:fictionId/premium-chapter/:chapterId/:pageIndex",
    async ({ params, user }) => {
      const chapterService = ChapterServiceFactory.createChapterService(
        true,
        user as User
      );
      return await chapterService.getChapterPage(
        params.fictionId,
        params.chapterId,
        Number(params.pageIndex)
      );
    },
    {
      params: "ChapterPageParams",
    }
  )
  .post(
    "/chapter/:chapterId/history/:pageIndex",
    async ({ params, repository }) => {
      const history = await repository.saveReadingHistory(
        params.chapterId,
        Number(params.pageIndex)
      );
      return createSuccessResponse(
        "Reading history saved successfully",
        history
      );
    },
    {
      params: "ChapterHistoryParams",
    }
  );
