import Elysia, { NotFoundError } from "elysia";
import { createSuccessResponse } from "../model/Response";
import { UserRepository } from "../repository/UserRepository";
import { join } from "path";

export const UserController = new Elysia()
  .get("/", async ({ set }) => {
    const repository = new UserRepository();
    const users = await repository.getAllUsers();

    return createSuccessResponse("Get all users successfully", users);
  })
  .get("/:userId", async ({ params }) => {
    const repository = new UserRepository();
    const user = await repository.getUserById(params.userId);
    return createSuccessResponse("Get user successfully", user);
  })
  .get("/:userId/avatar", async ({ params }) => {
    const path = join("public", "users", params.userId, "avatar.jpeg");
    console.log(path);
    const file = Bun.file(path);
    if (!(await file.exists())) {
      throw new NotFoundError("Avatar not found");
    }
    return file;
  });
