import Elysia from "elysia";

export const UserController = new Elysia().get(
  "/",
  async () => "Viewing all users"
);
