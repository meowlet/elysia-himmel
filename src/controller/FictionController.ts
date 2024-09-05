import Elysia from "elysia";
import { AuthorizationError } from "../util/Error";

export const FictionController = new Elysia().get("/", async () => {
  return "This is the fiction controller";
});
