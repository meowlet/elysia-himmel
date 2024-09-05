import Elysia from "elysia";
import { AuthorizationError } from "../util/Error";
import { AuthPlugin } from "../plugin/AuthPlugin";
import { Database } from "../database/Database";
import { MeRepository } from "../repository/MeRepository";
import { createSuccessResponse } from "../model/Response";
import { AuthorizationErrorType } from "../util/Enum";
import { AuthModel } from "../model/AuthModel";
import { Constant } from "../util/Constant";
import jwt from "@elysiajs/jwt";

export const MeController = new Elysia()
  .use(AuthModel)
  .use(AuthPlugin)
  .derive(({ userId }) => {
    return {
      repository: new MeRepository(userId!),
    };
  })
  .get("/", async ({ repository }) => {
    return await repository.getCurrentUser();
  })
  .post("/sign-out", async ({ cookie, repository, userId }) => {
    cookie.accessToken.remove();
    cookie.refreshToken.remove();
    await repository.removeRefreshToken(userId as string);

    return createSuccessResponse<void>(
      "User signed out successfully",
      undefined
    );
  })
  .post(
    "/change-password",
    async ({ body, userId, repository }) => {
      if (!userId) {
        throw new AuthorizationError(
          "User not found",
          AuthorizationErrorType.USER_NOT_FOUND
        );
      }
      await repository.alterPassword(
        userId || "",
        body.currentPassword,
        body.newPassword
      );
      return createSuccessResponse<void>(
        "Password changed successfully",
        undefined
      );
    },
    {
      body: "ChangePasswordBody",
    }
  );
