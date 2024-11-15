import { ObjectId } from "mongodb";
import { Action, Resource } from "../util/Enum";
import { PremiumDuration } from "./MeModel";
import { RoleSensitivityLevel } from "./RoleModel";

// Enums
enum NotificationType {
  SYSTEM = "system",
  FOLLOW = "follow",
  COMMENT = "comment",
  // Add more types as needed
}

export enum AuthorApplicationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum FictionType {
  FREE = "free",
  PREMIUM = "premium",
}

export enum FictionStatus {
  DRAFT = "draft",
  FINISHED = "finished",
  ONGOING = "ongoing",
  HIATUS = "hiatus",
}

export enum PaymentStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
}

enum PaymentMethod {
  MOMO = "momo",
  // Add more payment methods as needed
}
export enum TransactionType {
  PREMIUM_SUBSCRIPTION = "premium_subscription",
  AUTHOR_PAYOUT = "author_payout",
}

// Interfaces
interface User {
  googleId?: string;
  username?: string;
  fullName?: string;
  email: string;
  passwordHash?: string;
  role: string | ObjectId | null; // Reference to Role._id
  authorApplicationStatus?: AuthorApplicationStatus;
  earnings: number;
  isPremium: boolean;
  premiumExpiryDate?: Date; // Premium subscription expiry date
  favorites: string[] | ObjectId[]; // Array of fiction_ids
  bookmarks: string[] | ObjectId[]; // Array of chapter_ids
  readingHistory?: ReadingHistory[]; // Array of reading history
  createdAt: Date;
  updatedAt: Date;
  bio?: string;
}

interface AuthorApplication {
  user: string | ObjectId; // Reference to User._id
  status: AuthorApplicationStatus;
  applicationDate: Date;
  notes?: string;
}

interface ReadingHistory {
  chapter: string | ObjectId; // Reference to Chapter._id
  lastReadPage: number;
  lastReadTime: Date;
}

interface Role {
  name: string;
  description?: string;
  sensitivityLevel: string;
  permissions: {
    resource: Resource;
    actions: Action[];
  }[]; // Array of resource-action pairs
}

interface FictionStats {
  viewCount: number;
  ratingCount: number;
  averageRating: number;
  commentCount: number;
  favoriteCount: number;
}

interface Fiction {
  title: string;
  description: string;
  author: string | ObjectId; // Reference to User._id
  tags: string[] | ObjectId[]; // Array of tag_ids
  stats: FictionStats;
  status: FictionStatus;
  createdAt: Date;
  updatedAt: Date;
  type: FictionType; // Distinguishes between free and premium fictions
}

interface Chapter {
  fiction: string | ObjectId; // Reference to Fiction._id
  chapterIndex: number;
  pageCount: number;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Tag {
  name: string;
  code: string;
  description?: string;
  workCount: number;
  isDeleted?: boolean;
}

interface Rating {
  user: string | ObjectId; // Reference to User._id
  fiction: string | ObjectId; // Reference to Fiction._id
  score: number;
  review?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Comment {
  user: string | ObjectId; // Reference to User._id
  fiction: string | ObjectId; // Reference to Fiction._id
  content: string;
  likes: string[] | ObjectId[]; // Array of user_ids
  dislikes: string[] | ObjectId[]; // Array of user_ids
  createdAt: Date;
  updatedAt: Date;
}

interface Rating {
  user: string | ObjectId; // Reference to User._id
  fiction: string | ObjectId; // Reference to Fiction._id
  score: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Forum {
  title: string;
  description?: string;
  createdBy: string | ObjectId; // Reference to User._id
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface PostContent {
  title: string;
  content: string;
}

interface Post {
  forum: string | ObjectId; // Reference to Forum._id
  user: string | ObjectId; // Reference to User._id
  content: PostContent;
  commentCount: number;
  recentComments: ForumComment[];
  createdAt: Date;
  updatedAt: Date;
}

interface ForumComment {
  post: string | ObjectId; // Reference to Post._id
  user: string | ObjectId; // Reference to User._id
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

interface NotificationContent {
  title: string;
  content: string;
}

interface Notification {
  user: string | ObjectId; // Reference to User._id
  content: NotificationContent;
  type: NotificationType;
  link: string;
  isRead: boolean;
  createdAt: Date;
}

interface Follow {
  follower: string | ObjectId; // Reference to User._id
  followed: string | ObjectId; // Reference to User._id
  createdAt: Date;
}

interface Transaction {
  requestId: string;
  user: string | ObjectId;
  amount: number;
  type: TransactionType;
  orderInfo: string;
  status: PaymentStatus;
  orderId: string;
  premiumDuration?: PremiumDuration;
  authorId?: string | ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthorApplication {
  user: string | ObjectId; // Reference to User._id
  status: AuthorApplicationStatus;
  applicationDate: Date;
  reviewDate?: Date;
  reviewedBy?: string; // Reference to User._id (admin)
  notes?: string;
}

interface SearchQuery {
  user: string | ObjectId; // Reference to User._id
  keyword?: string;
  filters?: object; // Store advanced filters
  createdAt: Date;
}

// Export all interfaces
export {
  User,
  Role,
  Fiction,
  Chapter,
  Tag,
  Rating,
  Comment,
  Forum,
  Post,
  Notification,
  Follow,
  Transaction,
  AuthorApplication,
  SearchQuery,
  ReadingHistory,
};

// System description
/*
This is an online comic reading system. The main components of the system are the comic database and
the user community. There are 3 types of users:
1. Regular users: can read comics, comment, follow authors, and create comments on community posts.
2. Authors: can write, edit, delete chapters of the comics they publish.
3. Administrators: can manage the comic database, users, and system-related issues.

Fiction types:
1. Premium: comics uploaded by authors and purchased by users to read.
2. Free: comics uploaded by authors and free for users to read.

Authors will receive money based on the number of readers of their premium-tagged fictions.

Users can apply to become authors using the system's apply function.
Administrators can approve user applications to become authors using the application approval function.
Authors can register new comics using the system's comic publishing function.
Authors can decide whether their fiction is free or premium using the fiction type setting function.
The rate for premium fiction is 100,000 VND per 1000 views.

There are two main query functions: keyword search and advanced filtering.
*/
