import Elysia from "elysia";
import { UserController } from "./controller/UserController";
import { AuthController } from "./controller/AuthController";
import { AuthPlugin } from "./plugin/AuthPlugin";

export const Application = new Elysia()
  .group("/user", (app) => app.use(UserController))
  .group("/auth", (app) => app.use(AuthController));
