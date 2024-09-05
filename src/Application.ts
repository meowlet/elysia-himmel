import Elysia from "elysia";
import { MeController } from "./controller/MeController";
import { FictionController } from "./controller/FictionController";
import { AuthController } from "./controller/AuthController";

export const Application = new Elysia()
  .group("/me", (app) => app.use(MeController))
  .group("/fiction", (app) => app.use(FictionController))
  .group("/auth", (app) => app.use(AuthController));
