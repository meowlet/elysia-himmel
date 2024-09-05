import Elysia from "elysia";
import { AuthModel } from "../model/AuthModel";
import { AuthRepository } from "../repository/AuthRepository";
import { Database } from "../database/Database";
import { createSuccessResponse } from "../model/Response";
import jwt from "@elysiajs/jwt";
import { Constant } from "../util/Constant";
import { AuthorizationErrorType } from "../util/Enum";
import { AuthorizationError, ForbiddenError } from "../util/Error";
import { AuthPlugin } from "../plugin/AuthPlugin";

export const AuthController = new Elysia()
  .use(AuthModel)
  .use(Database)
  .use(
    jwt({
      name: "accessJwt",
      secret: Bun.env.JWT_SECRET || "The ultimate secret",
      exp: Constant.ACCESS_TOKEN_EXPIRY,
    })
  )
  .use(
    jwt({
      name: "refreshJwt",
      secret: Bun.env.JWT_SECRET || "The ultimate secret",
      exp: Constant.REFRESH_TOKEN_EXPIRY,
    })
  )
  .derive(() => {
    return {
      repository: new AuthRepository(),
    };
  })
  .post(
    "/sign-up",
    async ({ body, repository }) => {
      await repository.signUp(body.username, body.email, body.password);
      return createSuccessResponse<void>(
        "User signed up successfully",
        undefined
      );
    },
    {
      body: "SignUpBody",
    }
  )
  .post(
    "/sign-in",
    async ({ body, repository, accessJwt, refreshJwt, cookie }) => {
      const user = await repository.signIn(body.identifier, body.password);

      const accessToken = await accessJwt.sign({ sub: (user as any)._id });
      const refreshToken = await refreshJwt.sign({ sub: (user as any)._id });

      cookie.accessToken.set({
        value: accessToken,
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: Constant.ACCESS_TOKEN_EXPIRY_MS,
        path: "/",
      });

      cookie.refreshToken.set({
        value: refreshToken,
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: Constant.REFRESH_TOKEN_EXPIRY_MS,
        path: "/",
      });

      return createSuccessResponse<{
        accessToken: string;
        refreshToken: string;
      }>("User signed in successfully", {
        accessToken: accessToken,
        refreshToken: refreshToken,
      });
    },
    {
      body: "SignInBody",
    }
  )
  .post(
    "/forgot-password",
    async ({ body, repository }) => {
      await repository.createPasswordResetToken(body.email);

      return createSuccessResponse<void>(
        "Please check your email. It should be there in a few seconds.",
        undefined
      );
    },
    {
      body: "ForgotPasswordBody",
    }
  )
  .post(
    "/reset-password/:token",
    async ({ params, body, repository }) => {
      await repository.resetPassword(params.token, body.newPassword);

      return createSuccessResponse<void>(
        "Password reset successfully",
        undefined
      );
    },
    {
      body: "ResetPasswordBody",
    }
  )
  .post(
    "/refresh",
    async ({ accessJwt, refreshJwt, cookie, headers, repository }) => {
      const refreshToken =
        cookie.refreshToken?.value || headers.authorization?.substring(7);

      if (!refreshToken) {
        throw new AuthorizationError(
          "No token provided",
          AuthorizationErrorType.NO_TOKEN_PROVIDED
        );
      }

      const payload = await refreshJwt.verify(refreshToken);
      if (!payload) {
        throw new AuthorizationError(
          "Invalid token",
          AuthorizationErrorType.INVALID_TOKEN
        );
      }

      const userId: string = payload.sub as string;

      if (!(await repository.checkUserExists(userId))) {
        throw new AuthorizationError(
          "User not found",
          AuthorizationErrorType.INVALID_TOKEN
        );
      }

      const newAccessToken = await accessJwt.sign({ sub: userId });
      const newRefreshToken = await refreshJwt.sign({ sub: userId });

      cookie.accessToken.set({
        value: newAccessToken,
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: Constant.ACCESS_TOKEN_EXPIRY_MS,
      });

      cookie.refreshToken.set({
        value: newRefreshToken,
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: Constant.REFRESH_TOKEN_EXPIRY_MS,
      });

      repository.updateRefreshToken(userId, newRefreshToken);

      return createSuccessResponse<{
        accessToken: string;
        refreshToken: string;
      }>("Token refreshed successfully", {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    }
  );
