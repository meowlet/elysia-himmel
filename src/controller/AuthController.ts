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
import { User } from "../model/Entity";

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
    async ({ body, authRepository }) => {
      await authRepository.signUp(body.email, body.username, body.password);
      return createSuccessResponse<any>(
        "User signed up successfully",
        undefined
      );
    },
    {
      body: "signUp",
    }
  )
  .post(
    "/signin",
    async ({ body, authRepository, set }) => {
      const user = await authRepository.signIn(body.identifier, body.password);
      return createSuccessResponse<User>("User signed in successfully", user);
    },
    {
      body: "signIn",
    }
  );
