import { Action, Resource } from "../util/Enum";

// Enums
enum WorkType {
  COMIC = "comic",
  NOVEL = "novel",
  // Add more types as needed
}

enum NotificationType {
  SYSTEM = "system",
  FOLLOW = "follow",
  COMMENT = "comment",
  // Add more types as needed
}

// User interface
interface User {
  username: string;
  fullName?: string;
  email: string;
  passwordHash: string;
  isPremium: boolean;
  premiumExpiryDate?: Date;
  favoriteTags: string[]; // Array of tag_ids
  createdAt: Date;
  updatedAt: Date;
  bio?: string;
  role?: string; // Reference to Role._id
}

// Role interface
interface Role {
  name: string;
  description?: string;
  permissions: {
    resource: Resource;
    actions: Action[];
  }[]; // Array of resource-action pairs
}

// Work interface
interface Work {
  title: string;
  description: string;
  authorId: string; // Reference to User._id
  authorName: string; // Denormalized for quick access
  type: WorkType;
  tags: string[]; // Array of tag_ids
  viewCount: number;
  ratingCount: number;
  averageRating: number;
  commentCount: number;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Chapter interface
interface Chapter {
  workId: string; // Reference to Work._id
  chapterNumber: number;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// Tag interface
interface Tag {
  name: string;
  description?: string;
  workCount: number;
}

// Rating interface
interface Rating {
  userId: string; // Reference to User._id
  workId: string; // Reference to Work._id
  score: number;
  review?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Comment interface
interface Comment {
  userId: string; // Reference to User._id
  workId: string; // Reference to Work._id
  chapterId?: string; // Optional: Reference to Chapter._id
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// Forum interface
interface Forum {
  title: string;
  description?: string;
  createdById: string; // Reference to User._id
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Post interface
interface Post {
  forumId: string; // Reference to Forum._id
  userId: string; // Reference to User._id
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// Notification interface
interface Notification {
  userId: string; // Reference to User._id
  content: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: Date;
}

// Follow interface
interface Follow {
  followerId: string; // Reference to User._id
  followedId: string; // Reference to User._id
  createdAt: Date;
}

// Export all interfaces
export {
  User,
  Role,
  Work,
  Chapter,
  Tag,
  Rating,
  Comment,
  Forum,
  Post,
  Notification,
  Follow,
};
