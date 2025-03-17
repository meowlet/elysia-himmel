import Elysia from "elysia";
import { MeController } from "./controller/MeController";
import { FictionController } from "./controller/FictionController";
import { AuthController } from "./controller/AuthController";
import { TransactionController } from "./controller/TransactionController";
import { TagController } from "./controller/TagController";
import { UserController } from "./controller/UserController";
import { ChapterController } from "./controller/ChapterController";
import { InteractionController } from "./controller/InteractionController";
import { RoleController } from "./controller/RoleController";
import { StatisticController } from "./controller/StatisticController";
import { GuestPremiumController } from "./controller/GuestPremiumController";

export const Application = new Elysia()
  .group("/me", (app) => app.use(GuestPremiumController).use(MeController))
  .group("/fiction", (app) => app.use(FictionController))
  .group("/auth", (app) => app.use(AuthController))
  .group("/transaction", (app) => app.use(TransactionController))
  .group("/tag", (app) => app.use(TagController))
  .group("/user", (app) => app.use(UserController))
  .group("/interaction", (app) => app.use(InteractionController))
  .group("/role", (app) => app.use(RoleController))
  .group("/statistic", (app) => app.use(StatisticController));
