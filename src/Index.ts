import { Elysia } from "elysia";
import { Constant } from "./util/Constant";
import { Database } from "./database/Database";
import { Application } from "./Application";
import { AuthRepository } from "./repository/AuthRepository";
import { ErrorPlugin } from "./plugin/ErrorPlugin";
import { AuthorizationError, ConflictError } from "./util/Error";
import cors from "@elysiajs/cors";

const app = new Elysia()
  .use(cors())
  .use(ErrorPlugin)
  .use(Database)
  .get("/", () => {
    return "Welcome to Himmel!";
  })
  .group("/api", (app) => app.use(Application))
  .listen(Constant.PORT);

console.log(
  `The app should be running at http://${app.server?.hostname}:${app.server?.port}`
);
