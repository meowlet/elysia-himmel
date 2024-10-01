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
  .get(
    "/chapter/:chapterId/:pageIndex",
    async ({ params, repository }) => {
      const chapter = await repository.getChapter(params.chapterId);

      const fiction = await repository.getFiction(chapter.fiction as string);

      if (fiction.type != FictionType.FREE) {
        throw new ForbiddenError("This endpoint is for free chapters only");
      }

      const path = join(
        "public",
        "fictions",
        chapter.fiction as string,
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
  .get(
    "/premium/chapter/:chapterId/:pageIndex",
    async ({ params, repository, user }) => {
      const chapter = await repository.getChapter(params.chapterId);

      const path = join(
        "public",
        "fictions",
        chapter.fiction.toString(),
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
