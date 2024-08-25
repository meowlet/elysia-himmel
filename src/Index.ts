import { Elysia } from "elysia";
import { Constant } from "./util/Constant";
import { Database } from "./database/Database";
import { Application } from "./Application";

const app = new Elysia()
  .use(Database)
  .get("/", async () => {
    return "Welcome to Himmel!";
  })
  .group("/api", (app) => app.use(Application))
  .listen(3000);

console.log("The app should be running on http://localhost:3000");
