import Elysia, { NotFoundError } from "elysia";
import { ChapterModel } from "../model/ChapterModel";
import { ChapterRepository } from "../repository/ChapterRepository";
import { AuthPlugin } from "../plugin/AuthPlugin";
import { createSuccessResponse } from "../model/Response";
import { FictionType } from "../model/Entity";
import { join } from "path";
import { ForbiddenError } from "../util/Error";

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
  .get(
    "/:fictionId/premium-chapter/:chapterId/:pageIndex",
    async ({ params, user }) => {
      const path = join(
        "public",
        "premium-fictions",
        params.fictionId,
        "chapters",
        params.chapterId,
        params.pageIndex + ".jpeg"
      );
      const file = Bun.file(path);

      if (!(await file.exists())) {
        throw new NotFoundError("Chapter page not found");
      }

      if (!user.isPremium) {
        throw new ForbiddenError("You must be premium to access this chapter");
      }

      return file;
    },
    {
      params: "ChapterPageParams",
    }
  );
