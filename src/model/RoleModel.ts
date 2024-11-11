import Elysia, { t } from "elysia";
import { Action, Resource } from "../util/Enum";

export const RoleSensitivityLevel = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

export const RoleModel = new Elysia().model({
  CreateRoleBody: t.Object({
    name: t.String({
      minLength: 1,
      maxLength: 50,
    }),
    description: t.Optional(
      t.String({
        maxLength: 200,
      })
    ),
    permissions: t.Array(
      t.Object({
        resource: t.Enum(Resource),
        actions: t.Array(t.Enum(Action)),
      })
    ),
  }),
  UpdateRoleBody: t.Object({
    name: t.Optional(
      t.String({
        minLength: 1,
        maxLength: 50,
      })
    ),
    description: t.Optional(
      t.String({
        maxLength: 200,
      })
    ),
    permissions: t.Optional(
      t.Array(
        t.Object({
          resource: t.Enum(Resource),
          actions: t.Array(t.Enum(Action)),
        })
      )
    ),
  }),
  QueryRoleParams: t.Object({
    query: t.Optional(t.String()), // search by name or description
    resource: t.Optional(t.Enum(Resource)), // filter by resource
    action: t.Optional(t.Enum(Action)), // filter by action
    sensitivityLevel: t.Optional(t.Enum(RoleSensitivityLevel)), // filter by sensitivity
    hasPermission: t.Optional(t.Boolean()), // filter roles with/without any permissions
    sortBy: t.Optional(
      t.Enum({
        name: "name",
        createdAt: "createdAt",
        updatedAt: "updatedAt",
        sensitivityLevel: "sensitivityLevel",
      })
    ),
    sortOrder: t.Optional(
      t.Enum({
        asc: "asc",
        desc: "desc",
      })
    ),
    page: t.Optional(t.Number({ minimum: 1 })),
    limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
  }),
});
