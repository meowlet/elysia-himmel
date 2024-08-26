import Elysia from "elysia";
import { AuthModel } from "../model/AuthModel";
import { AuthRepository } from "../repository/AuthRepository";
import { Database } from "../database/Database";
import { createErrorResponse, createSuccessResponse } from "../model/Response";
import {
  validateEmail,
  validatePassword,
  validateUsername,
} from "../util/InputValidator";

export const AuthController = new Elysia()
  .use(AuthModel)
  .use(Database)
  .derive(({ database }) => {
    return {
      authRepository: new AuthRepository(database),
    };
  })
  .post(
    "/signup",
    async ({ body, authRepository, set }) => {
      const emailResult = validateEmail(body.email);
      if (!emailResult.isValid) {
        set.status = 400;
        return createErrorResponse(
          "Invalid email",
          "VALIDATION",
          emailResult.error || "Invalid email"
        );
      }

      const usernameResult = validateUsername(body.username);
      if (!usernameResult.isValid) {
        set.status = 400;
        return createErrorResponse(
          "Invalid username",
          "VALIDATION",
          usernameResult.error || "Invalid usernamme"
        );
      }

      const passwordResult = validatePassword(body.password);
      if (!passwordResult.isValid) {
        set.status = 400;
        return createErrorResponse(
          "Invalid password",
          "VALIDATION",
          passwordResult.error || "Invalid password"
        );
      }

      await authRepository.signup(body.email, body.username, body.password);
      return createSuccessResponse<any>(
        "User signed up successfully",
        undefined
      );
    },
    {
      body: "signUp",
    }
  );
