import Elysia from "elysia";
import { createSuccessResponse } from "../model/Response";
import { TagRepository } from "../repository/TagRepository";

export const TagController = new Elysia()
  .derive(() => {
    return {
      repository: new TagRepository(),
    };
  })
  .get("/", async ({ repository }) => {
    const tags = await repository.getAllTags();
    return createSuccessResponse("Tags retrieved successfully", tags);
  })
  .get("/:tagCode/fictions", async ({ params, repository }) => {
    const { tag, fictions } = await repository.getFictionsByTagCode(
      params.tagCode
    );
    return createSuccessResponse("Get fictions by tag code successfully", {
      tag,
      fictions,
    });
  });
