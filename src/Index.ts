import { Elysia } from "elysia";
import { Constant } from "./util/Constant";
import { Database } from "./database/Database";
import { Application } from "./Application";
import { AuthRepository } from "./repository/AuthRepository";
import { ErrorPlugin } from "./plugin/ErrorPlugin";
import { AuthorizationError, ConflictError } from "./util/Error";

const app = new Elysia()
  .use(ErrorPlugin)
  .use(Database)
  .get("/", () => {
    throw new AuthorizationError("You are not authorized to view this page.");
    return "Welcome to Himmel!";
  })
  .group("/api", (app) => app.use(Application))
  .listen(3000);

console.log("The app should be running on http://localhost:3000");
