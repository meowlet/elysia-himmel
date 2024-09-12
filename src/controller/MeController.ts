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
import { MeModel } from "../model/MeModel";

export const MeController = new Elysia()
  .use(MeModel)
  .use(AuthPlugin)
  .derive(async ({ userId }) => {
    const repository = new MeRepository(userId!);
    const user = await repository.getCurrentUser();
    if (!user) {
      throw new AuthorizationError(
        "User not found",
        AuthorizationErrorType.USER_NOT_FOUND
      );
    }
    return {
      repository: repository,
      user: user,
    };
  })
  .get("/", async ({ user }) => {
    return user;
  })
  .post("/sign-out", async ({ cookie, repository, user }) => {
    cookie.accessToken.remove();
    cookie.refreshToken.remove();
    await repository.removeRefreshToken(user._id.toString());

    return createSuccessResponse<void>("Successfully signed out", undefined);
  })
  .post(
    "/change-password",
    async ({ body, userId, repository }) => {
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
  )
  .post(
    "/update-profile",
    async ({ body, user, repository }) => {
      if (body.fullName) {
        user.fullName = body.fullName;
      }
      if (body.email) {
        user.email = body.email;
      }
      if (body.phoneNumber) {
        user.phoneNumber = body.phoneNumber;
      }

      await repository.updateUser(user);

      return createSuccessResponse("Update profile successfully", user);
    },
    {
      body: "UpdateProfileBody",
    }
  )
  .post(
    "/change-avatar",
    async ({ body, user, repository }) => {
      await repository.saveAvatar(body.avatar);
      return createSuccessResponse("Change avatar successfully", user);
    },
    {
      body: "ChangeAvatarBody",
    }
  )
  .get("/avatar", async ({ user, repository }) => {
    const avatar = await repository.getAvatar(user._id.toString());
    return createSuccessResponse("Get avatar successfully", avatar);
  });
