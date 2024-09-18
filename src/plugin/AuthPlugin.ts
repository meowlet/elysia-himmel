import Elysia from "elysia";
import { AuthorizationError } from "../util/Error";
import jwt from "@elysiajs/jwt";
import { AuthService } from "../service/AuthService";
import { Database } from "../database/Database";
import { AuthRepository } from "../repository/AuthRepository";
import { AuthorizationErrorType } from "../util/Enum";
import { MeRepository } from "../repository/MeRepository";

export const AuthPlugin = new Elysia()
  .use(Database)
  .use(
    jwt({
      name: "jwt",
      secret: Bun.env.JWT_SECRET || "The ultimate secret",
    })
  )
  .derive({ as: "global" }, async ({ headers, jwt, cookie }) => {
    const accessToken =
      cookie.accessToken?.value || headers.authorization?.substring(7);

    if (!accessToken) {
      throw new AuthorizationError(
        "No token provided",
        AuthorizationErrorType.NO_TOKEN_PROVIDED
      );
    }

    const payload = await jwt.verify(accessToken);

    if (!payload) {
      throw new AuthorizationError(
        "Invalid token",
        AuthorizationErrorType.INVALID_TOKEN
      );
    }

    return {
      userId: payload.sub,
    };
  });
