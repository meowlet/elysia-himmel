import Elysia, { t } from "elysia";

export const InteractionModel = new Elysia().model({
  FictionIdParams: t.Object({
    fictionId: t.String({
      minLength: 24,
      maxLength: 24,
      error: "Fiction ID must be 24 characters long",
    }),
  }),
  RateFictionBody: t.Object({
    score: t.Number({ minimum: 1, maximum: 5 }),
  }),
  RateCommentBody: t.Object({
    isUseful: t.Boolean(),
  }),
  DeleteRateCommentParams: t.Object({
    commentId: t.String({
      minLength: 24,
      maxLength: 24,
      error: "Comment ID must be 24 characters long",
    }),
  }),
  GetCommentsQuery: t.Object({
    page: t.Optional(t.Number({ minimum: 1 })),
    limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
  }),
  AddCommentBody: t.Object({
    content: t.String({ minLength: 1, maxLength: 1000 }),
  }),
  UpdateCommentBody: t.Object({
    content: t.String({ minLength: 1, maxLength: 1000 }),
  }),
  RateCommentParams: t.Object({
    commentId: t.String({
      minLength: 24,
      maxLength: 24,
      error: "Comment ID must be 24 characters long",
    }),
  }),
  CommentParams: t.Object({
    fictionId: t.String({
      minLength: 24,
      maxLength: 24,
      error: "Fiction ID must be 24 characters long",
    }),
    commentId: t.String({
      minLength: 24,
      maxLength: 24,
      error: "Comment ID must be 24 characters long",
    }),
  }),
});
