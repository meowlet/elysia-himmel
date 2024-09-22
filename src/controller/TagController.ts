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
  });
