import Elysia from "elysia";
import { AuthorizationError } from "../util/Error";
import jwt from "@elysiajs/jwt";
import { AuthService } from "../service/AuthService";
import { Database } from "../database/Database";
import { AuthRepository } from "../repository/AuthRepository";
import { AuthorizationErrorType } from "../util/Enum";

export const AuthPlugin = new Elysia()
  .use(Database)
  .use(
    jwt({
      name: "jwt",
      secret: Bun.env.JWT_SECRET || "The ultimate secret",
    })
  )
  .derive({ as: "global" }, async ({ headers, jwt, database, cookie }) => {
    const accessToken =
      cookie.refreshToken?.value || headers.authorization?.substring(7);

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

    const authService = new AuthService();
    authService.userId = payload.sub as string;
    authService.database = database;

    return {
      user: {
        _id: payload.sub,
      },
    };
  });
