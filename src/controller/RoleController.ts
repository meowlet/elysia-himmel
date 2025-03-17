import Elysia from "elysia";
import { AuthPlugin } from "../plugin/AuthPlugin";
import { createSuccessResponse } from "../model/Response";
import { Action, Resource } from "../util/Enum";
import { RoleModel } from "../model/RoleModel";
import { RoleRepository } from "../repository/RoleRepository";

export const RoleController = new Elysia()
  .use(AuthPlugin)
  .use(RoleModel)
  .derive(async ({ userId }) => {
    return {
      repository: new RoleRepository(userId!),
    };
  })
  .get(
    "/",
    async ({ query, repository }) => {
      const result = await repository.getAllRoles(query);
      return createSuccessResponse("Get all roles successfully", {
        items: result.roles,
        total: result.total,
        page: query.page || 1,
        limit: query.limit || 10,
      });
    },
    {
      query: "QueryRoleParams",
    }
  )
  .get("/:roleId", async ({ params, repository }) => {
    const role = await repository.getRoleById(params.roleId);
    return createSuccessResponse("Get role successfully", role);
  })
  .post(
    "/",
    async ({ body, repository }) => {
      const newRole = await repository.createRole(body);
      return createSuccessResponse("Role created successfully", newRole);
    },
    {
      body: "CreateRoleBody",
    }
  )
  .patch(
    "/:roleId",
    async ({ params, body, repository }) => {
      const updatedRole = await repository.updateRole(params.roleId, body);
      return createSuccessResponse("Role updated successfully", updatedRole);
    },
    {
      body: "UpdateRoleBody",
    }
  )
  .delete("/:roleId", async ({ params, repository }) => {
    await repository.deleteRole(params.roleId);
    return createSuccessResponse("Role deleted successfully", null);
  })
  .get("/resources", async () => {
    return createSuccessResponse("Get all resources successfully", {
      resources: Object.values(Resource),
      actions: Object.values(Action),
    });
  });
