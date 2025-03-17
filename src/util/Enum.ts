export enum Resource {
  USER = "user",
  ROLE = "role",
  PERMISSION = "permission",
  FICTION = "fiction",
  STATISTIC = "statistic",
  TAG = "tag",
  COMMENT = "comment",
  RATING = "rating",
  CHAPTER = "chapter",
  FORUM = "forum",
  POST = "post",
  NOTIFICATION = "notification",
}

export enum Action {
  CREATE = "create",
  READ = "read",
  UPDATE = "update",
  DELETE = "delete",
}

export enum AuthorizationErrorType {
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  INVALID_TOKEN = "INVALID_TOKEN",
  NO_TOKEN_PROVIDED = "NO_TOKEN_PROVIDED",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
}

export enum ForbiddenErrorType {
  ACCESS_DENIED = "ACCESS_DENIED",
  RESOURCE_FORBIDDEN = "RESOURCE_FORBIDDEN",
}

export enum ConflictErrorType {
  DUPLICATE_ENTRY = "DUPLICATE_ENTRY",
  VALIDATION_ERROR = "VALIDATION_ERROR",
}

export enum StorageErrorType {
  SAVE_FILE_ERROR = "SAVE_FILE_ERROR",
  DELETE_FILE_ERROR = "DELETE_FILE_ERROR",
}
