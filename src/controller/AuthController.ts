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
import { OAuth2Client } from "google-auth-library";

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
      const rememberMe = body.rememberMe || false;

      const accessToken = await accessJwt.sign({ sub: user._id.toString() });

      let refreshToken = "";
      if (rememberMe) {
        refreshToken = await refreshJwt.sign({ sub: user._id.toString() });
      }

      cookie.accessToken.set({
        value: accessToken,
        httpOnly: true,
        secure: false, // Change this to false for HTTP
        sameSite: "lax", // Change this to "lax" for cross-site usage
        maxAge: Constant.ACCESS_TOKEN_EXPIRY_MS,
        path: "/",
      });

      cookie.refreshToken.set({
        value: "",
        httpOnly: true,
        secure: false, // Change this to false for HTTP
        sameSite: "lax", // Change this to "lax" for cross-site usage
        maxAge: 0,
        path: "/",
      });

      if (rememberMe) {
        cookie.refreshToken.set({
          value: refreshToken,
          httpOnly: true,
          secure: false, // Change this to false for HTTP
          sameSite: "lax", // Change this to "lax" for cross-site usage
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
      }

      return createSuccessResponse<{
        accessToken: string;
      }>("User signed in successfully", {
        accessToken: accessToken,
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
        cookie.accessToken.remove();
        throw new AuthorizationError(
          "No token provided",
          AuthorizationErrorType.NO_TOKEN_PROVIDED
        );
      }

      const payload = await refreshJwt.verify(refreshToken);
      if (!payload) {
        cookie.accessToken.remove();
        cookie.refreshToken.remove();

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
        secure: false, // Change this to false for HTTP
        sameSite: "lax", // Change this to "lax" for cross-site usage
        maxAge: Constant.ACCESS_TOKEN_EXPIRY_MS,
      });

      cookie.refreshToken.set({
        value: newRefreshToken,
        httpOnly: true,
        secure: false, // Change this to false for HTTP
        sameSite: "lax", // Change this to "lax" for cross-site usage
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
  )
  .post(
    "/google-auth",
    async ({ body, repository, accessJwt, refreshJwt, cookie }) => {
      const client = new OAuth2Client(Bun.env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken: body.token,
        audience: Bun.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();

      if (!payload) {
        throw new AuthorizationError(
          "Invalid Google token",
          AuthorizationErrorType.INVALID_TOKEN
        );
      }

      const { sub: googleId, email, name } = payload;
      console.log(googleId, email, name);
      const { user, isNewUser } = await repository.signInOrSignUpWithGoogle(
        googleId,
        email!,
        name!
      );

      const accessToken = await accessJwt.sign({ sub: user._id.toString() });
      const refreshToken = await refreshJwt.sign({ sub: user._id.toString() });

      cookie.accessToken.set({
        value: accessToken,
        httpOnly: true,
        secure: false, // Change this to false for HTTP
        sameSite: "lax", // Change this to "lax" for cross-site usage
        maxAge: Constant.ACCESS_TOKEN_EXPIRY_MS,
        path: "/",
      });

      cookie.refreshToken.set({
        value: refreshToken,
        httpOnly: true,
        secure: false, // Change this to false for HTTP
        sameSite: "lax", // Change this to "lax" for cross-site usage
        maxAge: Constant.REFRESH_TOKEN_EXPIRY_MS,
        path: "/",
      });

      console.log(accessToken, refreshToken, isNewUser);

      return createSuccessResponse<{
        accessToken: string;
        refreshToken: string;
        isNewUser: boolean;
      }>(
        isNewUser
          ? "Sign up successfully with Google"
          : "Sign in successfully with Google",
        {
          accessToken: accessToken,
          refreshToken: refreshToken,
          isNewUser: isNewUser,
        }
      );
    },
    {
      body: "GoogleAuthBody",
    }
  )
  .post(
    "/set-username",
    async ({ body, repository }) => {
      await repository.setUsername(body.userId, body.username, body.fullName);
      return createSuccessResponse<void>(
        "Đặt tên người dùng thành công",
        undefined
      );
    },
    {
      body: "SetUsernameBody",
    }
  );
