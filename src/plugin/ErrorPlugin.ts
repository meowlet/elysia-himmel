import Elysia from "elysia";
import {
  AuthorizationError,
  ForbiddenError,
  ConflictError,
  ErrorResponse,
} from "../util/Error";

export const ErrorPlugin = new Elysia()
  .error({ AuthorizationError, ForbiddenError, ConflictError })
  .onError({ as: "global" }, ({ code, error, set }) => {
    switch (code) {
      case "ConflictError": {
        const response: ErrorResponse = {
          status: 409,
          message: error.message,
        };
        set.status = response.status;
        return response;
      }
      case "ForbiddenError": {
        const response: ErrorResponse = {
          status: 403,
          message: error.message,
        };
        set.status = response.status;
        return response;
      }
      case "AuthorizationError": {
        const response: ErrorResponse = {
          status: 401,
          message: error.message,
        };
        set.status = response.status;
        return response;
      }
      default: {
        if (code === "NOT_FOUND") {
          const response: ErrorResponse = {
            status: 404,
            message: "Resource not found",
          };
          set.status = response.status;
          return response;
        } else if (code === "VALIDATION") {
          const response: ErrorResponse = {
            status: 400,
            message: "Bad request",
          };
          set.status = response.status;
          return response;
        } else if (code === "PARSE") {
          const response: ErrorResponse = {
            status: 422,
            message: "Invalid request",
          };
          set.status = response.status;
          return response;
        } else if (code === "UNKNOWN") {
          const response: ErrorResponse = {
            status: 520,
            message: "Unknown error",
          };
          set.status = response.status;
          return response;
        } else {
          const response: ErrorResponse = {
            status: 500,
            message: "Internal server error",
          };
          set.status = response.status;
          return response;
        }
      }
    }
  });
