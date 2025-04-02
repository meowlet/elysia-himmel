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
  .get("/iterate", async ({ repository, query }) => {
    const iterator = await repository.createTagIterator(query);
    const results = [];

    const {
      minWorkCount,
      maxWorkCount,
      excludeEmpty = false,
      nameStartsWith,
      includeFields,
    } = query;

    const fieldsToInclude = includeFields
      ? includeFields.split(",")
      : ["id", "name", "code", "workCount", "description"];

    while (iterator.hasNext()) {
      const tag = iterator.next();

      if (
        (minWorkCount && tag.workCount < Number(minWorkCount)) ||
        (maxWorkCount && tag.workCount > Number(maxWorkCount)) ||
        (excludeEmpty === "true" && tag.workCount === 0) ||
        (nameStartsWith && !tag.name.startsWith(nameStartsWith))
      ) {
        continue;
      }

      const resultItem: any = {};

      if (fieldsToInclude.includes("id")) resultItem.id = (tag as any)._id;
      if (fieldsToInclude.includes("name")) resultItem.name = tag.name;
      if (fieldsToInclude.includes("code")) resultItem.code = tag.code;
      if (fieldsToInclude.includes("workCount"))
        resultItem.workCount = tag.workCount;
      if (fieldsToInclude.includes("description") && tag.description)
        resultItem.description = tag.description;

      results.push(resultItem);
    }

    return createSuccessResponse("Tags iterated successfully", {
      results,
      count: results.length,
      filters: {
        minWorkCount,
        maxWorkCount,
        excludeEmpty,
        nameStartsWith,
        includeFields,
      },
    });
  })
  .get("/fiction/:fictionId/tags/iterate", async ({ params, repository }) => {
    const iterator = await repository.createFictionTagIterator(
      params.fictionId
    );
    const results = [];

    while (iterator.hasNext()) {
      const tag = iterator.next();
      results.push({
        id: (tag as any)._id,
        name: tag.name,
        code: tag.code,
      });
    }

    return createSuccessResponse("Fiction tags iterated successfully", {
      results,
    });
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
