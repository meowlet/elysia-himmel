import Elysia from "elysia";

export const AuthController = new Elysia().get(
  "/signup",
  async () => "Viewing signup page"
);
