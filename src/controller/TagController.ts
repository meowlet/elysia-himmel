import Elysia from "elysia";
import { createSuccessResponse } from "../model/Response";
import { TagRepository } from "../repository/TagRepository";
import { TagModel } from "../model/TagModel";
import { AuthPlugin } from "../plugin/AuthPlugin";

export const TagController = new Elysia()
  .use(TagModel)
  .derive(() => {
    return {
      repository: new TagRepository(""),
    };
  })
  .get("/", async ({ repository, query }) => {
    const tags = await repository.getAllTags(query);
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
  })
  .use(AuthPlugin)
  .derive(({ userId }) => {
    return {
      repository: new TagRepository(userId || ""),
    };
  })
  .delete("/:tagId", async ({ params, repository }) => {
    const deletedTag = await repository.deleteTag(params.tagId);
    return createSuccessResponse("Tag deleted successfully", deletedTag);
  })
  .patch(
    "/:tagId",
    async ({ params, body, repository }) => {
      const updatedTag = await repository.updateTag(params.tagId, body);
      return createSuccessResponse("Tag updated successfully", updatedTag);
    },
    {
      params: "TagIdParams",
      body: "UpdateTagBody",
    }
  );
