import Elysia, { NotFoundError } from "elysia";
import { createSuccessResponse } from "../model/Response";
import { UserRepository } from "../repository/UserRepository";
import { join } from "path";
import { AuthModel } from "../model/AuthModel";
import { AuthPlugin } from "../plugin/AuthPlugin";
import { UserModel } from "../model/UserModel";

export const UserController = new Elysia()
  .use(UserModel)
  .derive(() => {
    return {
      repository: new UserRepository(""),
    };
  })
  .get(
    "/",
    async ({ query, repository }) => {
      const users = await repository.queryUsers(query);
      return createSuccessResponse("Users retrieved successfully", users);
    },
    {
      query: "QueryUserParams",
    }
  )
  .use(AuthPlugin)
  .derive(({ userId }) => {
    return {
      repository: new UserRepository(userId!),
    };
  })
  .get("/:userId", async ({ params, userId }) => {
    const repository = new UserRepository(userId!);
    const user = await repository.getUserById(params.userId);
    return createSuccessResponse("Get user successfully", user);
  })
  .delete("/:userId", async ({ params, userId }) => {
    const repository = new UserRepository(userId!);
    await repository.deleteUser(params.userId);
    return createSuccessResponse("Delete user successfully", null);
  })
  .get("/:userId/avatar", async ({ params }) => {
    const path = join("public", "users", params.userId, "avatar.jpeg");
    console.log(path);
    const file = Bun.file(path);
    if (!(await file.exists())) {
      throw new NotFoundError("Avatar not found");
    }
    return file;
  })
  .patch(
    "/:userId",
    async ({ params, body, repository }) => {
      const updatedUser = await repository.updateUser(params.userId, body);
      return createSuccessResponse("User updated successfully", updatedUser);
    },
    {
      params: "UserIdParams",
      body: "UpdateUserBody",
    }
  );
