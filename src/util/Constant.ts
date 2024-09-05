export class Constant {
  // Database configuration
  static readonly DATABASE_PATH = "test"; // Path to the database

  // Server configuration
  static readonly PORT = 3000; // Port for the backend server
  static readonly FE_URL = "http://localhost:3000"; // URL for the frontend

  // Security settings
  static readonly SALT = 8; // Salt rounds for bcrypt hashing
  static readonly ACCESS_TOKEN_EXPIRY = "15m"; // Access token expiry time
  static readonly REFRESH_TOKEN_EXPIRY = "7d"; // Refresh token expiry time

  // Token expiration in milliseconds
  static readonly ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // Access token expiry in milliseconds (15 minutes)
  static readonly REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // Refresh token expiry in milliseconds (7 days)

  // MongoDB collection names
  static readonly USER_COLLECTION = "users"; // Collection for user data
  static readonly POST_COLLECTION = "posts"; // Collection for post data
  static readonly COMMENT_COLLECTION = "comments"; // Collection for comment data
}
