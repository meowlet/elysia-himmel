import Elysia, { t } from "elysia";

export const TagModel = new Elysia().model({
  // Query params cho việc lấy danh sách tags
  QueryTagParams: t.Object({
    query: t.Optional(t.String()), // Search by name/code
    sortBy: t.Optional(
      t.Union([
        t.Literal("name"),
        t.Literal("code"),
        t.Literal("createdAt"),
        t.Literal("workCount"),
        t.Literal("favoriteCount"),
      ])
    ),
    sortOrder: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
    page: t.Optional(t.Number({ minimum: 1 })),
    limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
  }),

  // Body cho việc tạo tag mới
  CreateTagBody: t.Object({
    name: t.String({
      minLength: 1,
      maxLength: 50,
      error: "Tag name must be between 1 and 50 characters",
    }),
    code: t.String({
      minLength: 1,
      maxLength: 20,
      pattern: "^[a-z0-9-]+$",
      error:
        "Tag code must contain only lowercase letters, numbers, and hyphens",
    }),
    description: t.Optional(
      t.String({
        maxLength: 200,
        error: "Description must not exceed 200 characters",
      })
    ),
  }),

  // Body cho việc cập nhật tag
  UpdateTagBody: t.Object({
    name: t.Optional(
      t.String({
        minLength: 1,
        maxLength: 50,
        error: "Tag name must be between 1 and 50 characters",
      })
    ),
    code: t.Optional(
      t.String({
        minLength: 1,
        maxLength: 20,
        pattern: "^[a-z0-9-]+$",
        error:
          "Tag code must contain only lowercase letters, numbers, and hyphens",
      })
    ),
    description: t.Optional(
      t.String({
        maxLength: 200,
        error: "Description must not exceed 200 characters",
      })
    ),
  }),

  // Params cho các operations cần tag ID
  TagIdParams: t.Object({
    tagId: t.String({
      minLength: 24,
      maxLength: 24,
      error: "Tag ID must be 24 characters long",
    }),
  }),

  // Params cho operations cần tag code
  TagCodeParams: t.Object({
    tagCode: t.String({
      minLength: 1,
      maxLength: 20,
      pattern: "^[a-z0-9-]+$",
      error: "Invalid tag code format",
    }),
  }),
});
