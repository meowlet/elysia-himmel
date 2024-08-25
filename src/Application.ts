import Elysia from "elysia";
import { UserController } from "./controller/UserController";
import { AuthController } from "./controller/AuthController";

export const Application = new Elysia()
  .group("/user", (app) => app.use(UserController))
  .group("/auth", (app) => app.use(AuthController));
