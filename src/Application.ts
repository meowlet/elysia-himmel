import Elysia from "elysia";
import { UserController } from "./controller/UserController";
import { AuthController } from "./controller/AuthController";
import { AuthPlugin } from "./plugin/AuthPlugin";
import { FictionController } from "./controller/FictionController";

export const Application = new Elysia()
  .group("/user", (app) => app.use(UserController))
  .group("/fiction", (app) => app.use(FictionController))
  .group("/auth", (app) => app.use(AuthController));
