import Elysia from "elysia";
import { UserController } from "./controller/UserController";

export const Application = new Elysia().group("/user", (app) =>
  app.use(UserController)
);
