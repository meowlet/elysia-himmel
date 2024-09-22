import Elysia from "elysia";
import { createSuccessResponse } from "../model/Response";
import { UserRepository } from "../repository/UserRepository";

export const UserController = new Elysia().get("/", async ({ set }) => {
  const repository = new UserRepository();
  const users = await repository.getAllUsers();

  return createSuccessResponse("Lấy danh sách người dùng thành công", users);
});
