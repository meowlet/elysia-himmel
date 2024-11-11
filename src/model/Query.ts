import { SortField } from "../repository/FictionRepository";
import { TransactionStatus } from "../repository/TransactionRepository";
import { Resource, Action } from "../util/Enum";
import { FictionStatus, FictionType, TransactionType } from "./Entity";

// Base query interface cho tất cả các resource
export interface BaseQueryParams {
  // Các tham số phân trang cơ bản
  page?: number;
  limit?: number;
  // Các tham số sắp xếp cơ bản
  sortOrder?: "asc" | "desc";
  // Các tham số thời gian cơ bản
  createdFrom?: Date | null;
  createdTo?: Date | null;
}

// Base result interface
export interface BaseQueryResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Fiction query
export interface QueryFictionParams extends BaseQueryParams {
  query?: string;
  author?: string;
  tags?: string[];
  status?: FictionStatus;
  type?: FictionType;
  sortBy?: SortField;
  minViewCount?: number;
  minRating?: number;
}

// Comment query
export interface QueryCommentParams extends BaseQueryParams {
  query?: string; // Search by content
  user?: string;
  fiction?: string;
  sortBy?: "createdAt" | "likes" | "dislikes";
}

// Chapter query
export interface QueryChapterParams extends BaseQueryParams {
  fiction?: string;
  chapterIndex?: number;
  sortBy?: "chapterIndex" | "createdAt" | "updatedAt";
}

// Tag query
export interface QueryTagParams extends BaseQueryParams {
  query?: string; // Search by name/code
  sortBy?: "name" | "code" | "createdAt";
}

// Role query
export interface QueryRoleParams extends BaseQueryParams {
  query?: string; // Search by name
  hasPermission?: {
    resource: Resource;
    action: Action;
  };
  sortBy?: "name" | "createdAt";
}

// User query
export interface QueryUserParams extends BaseQueryParams {
  query?: string; // Search by username/email
  role?: string;
  isAuthor?: boolean;
  isPremium?: boolean;
  sortBy?: UserSortField;
}

export enum UserSortField {
  USERNAME = "username",
  CREATED_AT = "createdAt",
  EARNINGS = "earnings",
}

// Transaction query
export interface QueryTransactionParams extends BaseQueryParams {
  status?: TransactionStatus;
  type?: TransactionType;
  user?: string;
  sortBy?: "amount" | "createdAt";
  minAmount?: number;
  maxAmount?: number;
}
