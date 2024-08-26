import Elysia from "elysia";
import { AuthorizationError } from "../util/Error";
import jwt from "@elysiajs/jwt";
import { AuthService } from "../service/AuthService";
import { Database } from "../database/Database";
import { AuthRepository } from "../repository/AuthRepository";

export const AuthPlugin = new Elysia()
  .use(Database)
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "The ultimate secret",
    })
  )
  .derive({ as: "global" }, async ({ headers, jwt, database }) => {
    const token = headers["Authorization"]?.replace("Bearer ", "");
    if (!token) {
      throw new AuthorizationError("Token not found");
    }

    const decodedToken = await jwt.verify(token);
    if (!decodedToken) {
      throw new AuthorizationError("Invalid token");
    } else {
      const authService = new AuthService();
      authService.userId = decodedToken.userId as string;
      authService.database = database;

      return {};
    }
  });
