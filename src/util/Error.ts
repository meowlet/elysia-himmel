export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
  }
}

export class ConflictError extends Error {
  constructor(message = "Validation Error") {
    super(message);
  }
}

export class AuthorizationError extends Error {
  constructor(message = "Authorization Error") {
    super(message);
  }
}
