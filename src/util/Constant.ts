export class Constant {
  // Database configuration
  static readonly DATABASE_PATH = "test"; // Path to the database

  // Server configuration
  static readonly PORT = 3000; // Port for the backend server
  static readonly BE_URL = "http://localhost:3000"; // URL for the backend
  static readonly FE_URL = "http://localhost:3001"; // URL for the frontend
  static readonly MOMO_ENDPOINT = "https://test-payment.momo.vn/v2/gateway/api"; // URL for MoMo API
  static readonly MOMO_IPN_URL =
    "http://54.255.240.72:4002/momo-payment-process"; // URL for MoMo IPN
  static readonly MOMO_REDIRECT_URL =
    "https://test-payment.momo.vn/v2/gateway/api/confirm-payment"; // URL for MoMo redirect

  // Security settings
  static readonly SALT = 8; // Salt rounds for bcrypt hashing
  static readonly ACCESS_TOKEN_EXPIRY = "15m"; // Access token expiry time
  static readonly REFRESH_TOKEN_EXPIRY = "7d"; // Refresh token expiry time

  // Token expiration in milliseconds
  static readonly ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // Access token expiry in milliseconds (15 minutes)
  static readonly REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // Refresh token expiry in milliseconds (7 days)

  // MongoDB collection names
  static readonly TRANSACTION_COLLECTION = "transactions"; // Collection for transaction data
  static readonly USER_COLLECTION = "users"; // Collection for user data
  static readonly POST_COLLECTION = "posts"; // Collection for post data
  static readonly COMMENT_COLLECTION = "comments"; // Collection for comment data
  static readonly BASE_URL = "http://localhost:3000"; // Base URL for the backend server
  static readonly UPLOAD_DIRECTORY = "public"; // Directory for uploaded files
  static readonly FICTION_COLLECTION = "fictions"; // Collection for fiction data
  static readonly TAG_COLLECTION = "tags"; // Collection for tag data
  static readonly CHAPTER_COLLECTION = "chapters"; // Collection for chapter data
  static readonly RATING_COLLECTION = "ratings"; // Collection for rating data
  static readonly ROLE_COLLECTION = "roles"; // Collection for role data
  static readonly AUTHOR_APPLICATION_COLLECTION = "author_applications";

  // Payment configuration
  static readonly PAYMENT_CURRENCY = "VND"; // Currency for payment
  static readonly STORE_NAME = "Himmel";

  // Momo secret key
  static readonly MOMO_PARTNER_CODE = Bun.env.MOMO_PARTNER_CODE || "";
  static readonly MOMO_ACCESS_KEY = Bun.env.MOMO_ACCESS_KEY || "";
  static readonly MOMO_SECRET_KEY = Bun.env.MOMO_SECRET_KEY || "";

  // Google secret key
  static readonly GOOGLE_CLIENT_ID = Bun.env.GOOGLE_CLIENT_ID || "";
  static readonly GOOGLE_CLIENT_SECRET = Bun.env.GOOGLE_CLIENT_SECRET || "";

  // Add these new constants
  static readonly GUEST_TOKEN_COLLECTION = "guest_tokens";
  static readonly MOMO_GUEST_REDIRECT_URL = `${
    Bun.env.FE_URL || "http://localhost:3000"
  }/premium/guest/success`;
  static readonly MOMO_GUEST_IPN_URL = `${
    Bun.env.API_URL || "http://localhost:8080"
  }/api/webhook/guest-premium`;
}
