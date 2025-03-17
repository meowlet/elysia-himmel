import {
  AuthorizationErrorType,
  ForbiddenErrorType,
  ConflictErrorType,
  StorageErrorType,
} from "./Enum";

export class CustomError extends Error {
  constructor(public message: string, public type: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthorizationError extends CustomError {
  constructor(
    message: string = "Authorization Error",
    type: AuthorizationErrorType = AuthorizationErrorType.INVALID_CREDENTIALS
  ) {
    super(message, type);
  }
}

export class ForbiddenError extends CustomError {
  constructor(
    message: string = "Forbidden",
    type: ForbiddenErrorType = ForbiddenErrorType.ACCESS_DENIED
  ) {
    super(message, type);
  }
}

export class ConflictError extends CustomError {
  constructor(
    message: string = "Conflict Error",
    type: ConflictErrorType = ConflictErrorType.VALIDATION_ERROR
  ) {
    super(message, type);
  }
}

export class StorageError extends CustomError {
  constructor(
    message: string = "Storage Error",
    type: StorageErrorType = StorageErrorType.SAVE_FILE_ERROR
  ) {
    super(message, type);
  }
}
