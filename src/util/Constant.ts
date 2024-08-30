export class Constant {
  static readonly DATABASE_PATH = "test";
  static readonly PORT = 3000;
  static readonly SALT = 8;
  static readonly ACESS_TOKEN_EXPIRY = "15m";
  static readonly REFRESH_TOKEN_EXPIRY = "7d";

  static readonly ACESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000;
  static readonly REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

  static readonly USER_COLLECTION = "users";
  static readonly POST_COLLECTION = "posts";
  static readonly COMMENT_COLLECTION = "comments";
}
