import { Elysia } from "elysia";
import mongoDatabase from "./database/Database";
import { Constant } from "./util/Constant";

const db = mongoDatabase.getDatabase();

const app = new Elysia()
  .get("/", () => {
    const userQuery = db.collection("fictions").find({});
    return userQuery.toArray();
  })
  .listen(3000);
console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
