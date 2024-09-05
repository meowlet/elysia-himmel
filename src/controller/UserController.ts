import Elysia from "elysia";
import { AuthorizationError } from "../util/Error";
import { AuthPlugin } from "../plugin/AuthPlugin";

export const UserController = new Elysia()
  .use(AuthPlugin)
  .get("/me", async () => {
    throw new AuthorizationError("You are not authorized to view this page.");
  });
