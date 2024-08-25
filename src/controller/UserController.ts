import Elysia from "elysia";
import { AuthorizationError } from "../util/Error";

export const UserController = new Elysia().get("/", async () => {
  throw new AuthorizationError("You are not authorized to view this page.");
});
