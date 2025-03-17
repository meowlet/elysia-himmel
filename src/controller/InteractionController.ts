import Elysia from "elysia";
import { AuthPlugin } from "../plugin/AuthPlugin";
import { createSuccessResponse } from "../model/Response";
import { InteractionModel } from "../model/InteractionModel";
import { InteractionRepository } from "../repository/InteractionRepository";

export const InteractionController = new Elysia()
  .use(InteractionModel)
  .derive(() => {
    return {
      repository: new InteractionRepository(""),
    };
  })
  .get(
    "/:fictionId/comments",
    async ({ params, query, repository }) => {
      const comments = await repository.getComments(params.fictionId, query);
      return createSuccessResponse("Comments retrieved successfully", comments);
    },
    {
      params: "FictionIdParams",
      query: "GetCommentsQuery",
    }
  )
  .use(AuthPlugin)
  .derive(({ userId }) => {
    return {
      repository: new InteractionRepository(userId!),
    };
  })
  // get current user's rating
  .get(
    "/:fictionId/rate",
    async ({ params, repository }) => {
      const rating = await repository.getRating(params.fictionId);
      return createSuccessResponse("Rating retrieved successfully", rating);
    },
    {
      params: "FictionIdParams",
    }
  )
  // Rating routes
  .post(
    "/:fictionId/rate",
    async ({ params, body, repository }) => {
      const updatedRating = await repository.rateFiction(
        params.fictionId,
        body.score
      );
      return createSuccessResponse("Fiction rated successfully", updatedRating);
    },
    {
      params: "FictionIdParams",
      body: "RateFictionBody",
    }
  )
  .post(
    "/:fictionId/comments",
    async ({ params, body, repository }) => {
      const newComment = await repository.addComment(params.fictionId, body);
      return createSuccessResponse("Comment added successfully", newComment);
    },
    {
      params: "FictionIdParams",
      body: "AddCommentBody",
    }
  )
  .patch(
    "/:fictionId/comments/:commentId",
    async ({ params, body, repository }) => {
      const updatedComment = await repository.updateComment(
        params.fictionId,
        params.commentId,
        body
      );
      return createSuccessResponse(
        "Comment updated successfully",
        updatedComment
      );
    },
    {
      params: "CommentParams",
      body: "UpdateCommentBody",
    }
  )
  .post(
    "/comments/:commentId/rate",
    async ({ params, body, repository }) => {
      const updatedComment = await repository.rateComment(
        params.commentId,
        body.isUseful
      );
      return createSuccessResponse(
        "Comment rated successfully",
        updatedComment
      );
    },
    {
      params: "RateCommentParams",
      body: "RateCommentBody",
    }
  )
  .delete(
    "/:fictionId/comments/:commentId",
    async ({ params, repository }) => {
      const result = await repository.deleteComment(
        params.fictionId,
        params.commentId
      );
      return createSuccessResponse("Comment deleted successfully", result);
    },
    {
      params: "CommentParams",
    }
  )
  .delete(
    "/comments/:commentId/rate",
    async ({ params, repository }) => {
      const result = await repository.deleteCommentRate(params.commentId);
      return createSuccessResponse("Comment rate deleted successfully", result);
    },
    {
      params: "DeleteRateCommentParams",
    }
  );
