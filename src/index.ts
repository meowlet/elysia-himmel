import { Elysia } from "elysia";
import { Constant } from "./util/Constant";
import { Database } from "./database/Database";

const app = new Elysia()
  .use(Database)
  .get("/", () => "Hello, world!")
  .listen(3000);

console.log("The app should be running on http://localhost:3000");
