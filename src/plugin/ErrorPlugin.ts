import Elysia from "elysia";
import {
  AuthorizationError,
  ForbiddenError,
  ConflictError,
  StorageError,
} from "../util/Error";
import { createErrorResponse } from "../model/Response";
import { logger } from "@bogeychan/elysia-logger";

export const ErrorPlugin = new Elysia()
  .error({ AuthorizationError, ForbiddenError, ConflictError, StorageError })
  .use(
    logger({
      level: "error",
    })
  )
  .onError({ as: "global" }, ({ code, error, set }) => {
    switch (code) {
      case "ConflictError": {
        set.status = 409;
        return createErrorResponse(
          "Conflict. The request could not be completed due to a conflict.",
          "CONFLICT",
          error.type,
          error.message
        );
      }
      case "ForbiddenError": {
        set.status = 403;
        return createErrorResponse(
          "Forbidden. You don't have permission to access this resource.",
          "FORBIDDEN",
          error.type,
          error.message
        );
      }
      case "AuthorizationError": {
        set.status = 401;
        return createErrorResponse(
          "Authorization error. You are not authorized to access this resource.",
          "UNAUTHORIZED",
          error.type,
          error.message
        );
      }
      case "NOT_FOUND": {
        set.status = 404;
        return createErrorResponse(
          "Not found. The requested resource could not be found.",
          "NOT_FOUND",
          "NOT_FOUND",
          error.message
        );
      }
      case "VALIDATION": {
        set.status = 400;
        try {
          const parsedError = JSON.parse(error.message);
          return createErrorResponse(
            "Validation error. The request could not be completed due to validation errors.",
            "VALIDATION",
            "VALIDATION_ERROR",
            parsedError.summary
          );
        } catch (err) {
          return createErrorResponse(
            "Validation error. The request could not be completed due to validation errors.",
            "VALIDATION",
            "VALIDATION_ERROR",
            error.message
          );
        }
      }
      case "PARSE": {
        set.status = 422;
        return createErrorResponse(
          "Invalid request. The server could not understand the request due to invalid syntax.",
          "UNPROCESSABLE_ENTITY",
          "PARSE_ERROR",
          error.message
        );
      }
      case "UNKNOWN": {
        set.status = 520;
        return createErrorResponse(
          "Unknown error. An unexpected error occurred.",
          "UNKNOWN_ERROR",
          "UNKNOWN_ERROR",
          error.message
        );
      }
      case "StorageError": {
        set.status = 500;
        return createErrorResponse(
          "Storage error. An unexpected error occurred on the storage.",
          "STORAGE_ERROR",
          "STORAGE_ERROR",
          error.message
        );
      }
      default: {
        set.status = 500;
        return createErrorResponse(
          "Internal server error. An unexpected error occurred on the server.",
          "INTERNAL_SERVER_ERROR",
          "INTERNAL_SERVER_ERROR",
          error.message
        );
      }
    }
  });

// {  "type": "validation",  "on": "body",  "summary": "Expected object",  "property": "root",  "message": "Expected object",  "expected": {    "email": "",    "username": "",    "password": ""  },  "errors": [    {      "summary": "Expected object",      "type": 46,      "schema": {        "type": "object",        "properties": {          "email": {            "type": "string"          },          "username": {            "type": "string"          },          "password": {            "type": "string"          }        },        "required": [          "email",          "username",          "password"        ],        "additionalProperties": false      },      "path": "",      "message": "Expected object"    }  ]}
