import Elysia, { NotFoundError, redirect } from "elysia";
import { AuthorizationError } from "../util/Error";
import { AuthPlugin } from "../plugin/AuthPlugin";
import { Database } from "../database/Database";
import { MeRepository } from "../repository/MeRepository";
import { createErrorResponse, createSuccessResponse } from "../model/Response";
import { AuthorizationErrorType } from "../util/Enum";
import { AuthModel } from "../model/AuthModel";
import { Constant } from "../util/Constant";
import jwt from "@elysiajs/jwt";
import { MeModel } from "../model/MeModel";
import { ObjectId, WithId } from "mongodb";
import { User } from "../model/Entity";

export const MeController = new Elysia()
  .use(MeModel)
  .use(AuthPlugin)
  .derive(async ({ userId }) => {
    const repository = new MeRepository(userId!);
    const user = await repository.authService.getUser();
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
  .get("/", async ({ user, repository }) => {
    const isAdmin = await repository.isUserAdmin();
    return createSuccessResponse("Get user successfully", {
      ...user,
      isAdmin: isAdmin,
    });
  })
  .get("/favorites", async ({ repository }) => {
    const favorites = await repository.getFavoriteFictions();
    return createSuccessResponse(
      "Get favorite fictions successfully",
      favorites
    );
  })
  .post("/sign-out", async ({ cookie, repository, user }) => {
    cookie.accessToken.remove();
    cookie.refreshToken.remove();
    await repository.removeRefreshToken();

    return createSuccessResponse<void>("Successfully signed out", undefined);
  })
  .post(
    "/change-password",
    async ({ body, userId, repository }) => {
      await repository.alterPassword(body.currentPassword, body.newPassword);
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
      const updatedUser: Partial<WithId<User>> = {
        _id: new ObjectId(user._id),
        fullName: body.fullName ?? user.fullName,
        email: body.email ?? user.email,
        isPremium: user.isPremium,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      await repository.updateUser(updatedUser as WithId<User>);

      return createSuccessResponse("Update profile successfully", user);
    },
    {
      body: "UpdateProfileBody",
    }
  )
  .post(
    "/avatar",
    async ({ body, repository }) => {
      await repository.saveAvatar(body.avatar);
      return createSuccessResponse("Change avatar successfully", null);
    },
    {
      body: "ChangeAvatarBody",
    }
  )
  .post(
    "/purchase-premium",
    async ({ user, repository, body }) => {
      if (user.isPremium) {
        throw new Error("You already have premium");
      }
      const paymentUrl = await repository.getPaymentUrl(body.duration);
      return createSuccessResponse("Redirect to payment", {
        paymentUrl: paymentUrl,
      });
    },
    {
      body: "PurchasePremiumBody",
    }
  )
  .post(
    "/apply-author",
    async ({ body, repository }) => {
      await repository.applyForAuthor(body.notes);
      return createSuccessResponse(
        "Author application submitted successfully",
        null
      );
    },
    {
      body: "ApplyAuthorBody",
    }
  )
  .delete("/author-application", async ({ repository }) => {
    await repository.cancelAuthorApplication();
    return createSuccessResponse(
      "Author application deleted successfully",
      null
    );
  });
