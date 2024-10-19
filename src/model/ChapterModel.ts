import Elysia, { error, t } from "elysia";
import { SortField, SortOrder } from "../repository/FictionRepository";
import { FictionStatus, FictionType } from "../model/Entity";

export const ChapterModel = new Elysia().model({
  CreateChapterBody: t.Object({
    chapterIndex: t.String({
      pattern: "^[1-9][0-9]{0,5}$",
      error: "Chapter index must be a number between 1 and 999999",
    }),
    title: t.String({
      minLength: 1,
      maxLength: 256,
      error: "Title must be between 1 and 256 characters",
    }),
    content: t.Array(
      t.File({
        type: ["image/jpeg", "image/png"],
        maxSize: 1024 * 1024 * 5, // 5MB
        error:
          "The cover must be a valid image (JPEG or PNG) and less than 5MB",
      }),
      { minItems: 1, maxItems: 256 }
    ),
  }),
  ChapterParams: t.Object({
    fictionId: t.String({
      pattern: "^[0-9a-fA-F]{24}$",
      error: "Fiction ID must be a valid UUID",
    }),
    chapterIndex: t.String({
      pattern: "^[1-9][0-9]{0,5}$",
      error: "Chapter index must be a number between 1 and 999999",
    }),
  }),
  ChapterIdParams: t.Object({
    chapterId: t.String({
      pattern: "^[0-9a-fA-F]{24}$",
      error: "Chapter id must be a valid UUID",
    }),
  }),
  ChapterPageParams: t.Object({
    chapterId: t.String({
      pattern: "^[0-9a-fA-F]{24}$",
      error: "Chapter id must be a valid UUID",
    }),
    pageIndex: t.String({
      pattern: "^[1-9][0-9]{0,5}$",
      error: "Page index must be a number between 1 and 999999",
    }),
    fictionId: t.String({
      pattern: "^[0-9a-fA-F]{24}$",
      error: "Fiction id must be a valid UUID",
    }),
  }),
  BookmarkChapterParams: t.Object({
    chapterId: t.String({
      pattern: "^[0-9a-fA-F]{24}$",
      error: "Chapter id must be a valid UUID",
    }),
  }),
  ChapterHistoryParams: t.Object({
    chapterId: t.String({
      pattern: "^[0-9a-fA-F]{24}$",
      error: "Chapter id must be a valid UUID",
    }),
    pageIndex: t.String({
      pattern: "^[1-9][0-9]{0,5}$",
      error: "Page index must be a number between 1 and 999999",
    }),
  }),
});
