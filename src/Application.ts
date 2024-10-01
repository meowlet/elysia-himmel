import Elysia from "elysia";
import { MeController } from "./controller/MeController";
import { FictionController } from "./controller/FictionController";
import { AuthController } from "./controller/AuthController";
import { PaymentController } from "./controller/PaymentController";
import { TagController } from "./controller/TagController";
import { UserController } from "./controller/UserController";
import { ChapterController } from "./controller/ChapterController";
import { InteractionController } from "./controller/InteractionController";

export const Application = new Elysia()
  .group("/me", (app) => app.use(MeController))
  .group("/fiction", (app) => app.use(FictionController).use(ChapterController))
  .group("/auth", (app) => app.use(AuthController))
  .group("/payment", (app) => app.use(PaymentController))
  .group("/tag", (app) => app.use(TagController))
  .group("/user", (app) => app.use(UserController))
  .group("/interaction", (app) => app.use(InteractionController));
