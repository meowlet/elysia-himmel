import { Db, ObjectId, WithId } from "mongodb";
import { StorageService } from "../service/StorageService";
import { database } from "../database/Database";
import { NotFoundError } from "elysia";
import {
  Chapter,
  Fiction,
  FictionType,
  ReadingHistory,
  User,
} from "../model/Entity";
import { Constant } from "../util/Constant";
import { ConflictError, ForbiddenError } from "../util/Error";
import path from "path";
import sharp from "sharp";
import { AuthService } from "../service/AuthService";

export class ChapterRepository {
  private database: Db;
  private storageService: StorageService;
  public authService: AuthService;

  constructor(private userId: string) {
    this.database = database;
    this.authService = new AuthService(this.database, this.userId);
    this.storageService = new StorageService();
  }

  async bookmarkChapter(chapterId: string) {
    const user = await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .findOne({ _id: new ObjectId(this.userId) });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const isBookmarked = user.bookmarks?.some(
      (bookmark) => bookmark.toString() === chapterId
    );

    let updateOperation;
    if (isBookmarked) {
      updateOperation = { $pull: { bookmarks: new ObjectId(chapterId) } };
    } else {
      updateOperation = { $addToSet: { bookmarks: new ObjectId(chapterId) } };
    }

    const result = await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .updateOne({ _id: new ObjectId(this.userId) }, updateOperation);

    if (!result.acknowledged) {
      throw new Error("Failed to update bookmark");
    }

    return !isBookmarked;
  }

  async getFiction(fictionId: string) {
    const fiction = await this.database
      .collection<Fiction>(Constant.FICTION_COLLECTION)
      .findOne({ _id: new ObjectId(fictionId) });

    if (!fiction) {
      throw new NotFoundError("Fiction not found");
    }

    return fiction;
  }

  private async saveContent(
    fictionId: string,
    chapterId: string,
    content: File[],
    isFictionPremium: boolean
  ) {
    const savePromises = content.map(async (file, index) => {
      const buffer = await file.arrayBuffer();
      const jpegBuffer = await sharp(buffer).jpeg({ quality: 80 }).toBuffer();

      const imageName = String(index + 1) + ".jpeg";
      const imagePath = path.join(
        isFictionPremium ? "premium-fictions" : "fictions",
        fictionId,
        "chapters",
        chapterId,
        imageName
      );

      const imageFile = new File([jpegBuffer], imageName, {
        type: "image/jpeg",
      });
      return this.storageService.saveFile(imageFile, imagePath);
    });

    await Promise.all(savePromises);
  }

  async saveReadingHistory(
    chapterId: string,
    lastReadPage: number
  ): Promise<ReadingHistory> {
    const user = await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .findOne({ _id: new ObjectId(this.userId) });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const chapter = await this.database
      .collection<Chapter>(Constant.CHAPTER_COLLECTION)
      .findOne({ _id: new ObjectId(chapterId) });

    if (!chapter) {
      throw new NotFoundError("Chapter not found");
    }

    const newHistory: ReadingHistory = {
      chapter: new ObjectId(chapterId),
      lastReadPage: lastReadPage,
      lastReadTime: new Date(),
    };

    // Tìm và cập nhật bản ghi hiện có cho cùng một fiction
    const updateResult = await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .updateOne(
        {
          _id: new ObjectId(this.userId),
          "readingHistory.chapter": {
            $in: await this.getChapterIdsForFiction(
              new ObjectId(chapter.fiction)
            ),
          },
        },
        {
          $set: { "readingHistory.$": newHistory },
        }
      );

    // Nếu không tìm thấy bản ghi hiện có, thêm mới vào đầu mảng
    if (updateResult.matchedCount === 0) {
      const pushResult = await this.database
        .collection<User>(Constant.USER_COLLECTION)
        .updateOne(
          { _id: new ObjectId(this.userId) },
          {
            $push: {
              readingHistory: {
                $each: [newHistory],
                $position: 0,
              },
            },
          }
        );

      if (!pushResult.acknowledged) {
        throw new Error("Failed to add new reading history");
      }
    }

    if (!updateResult.acknowledged) {
      throw new Error("Failed to update reading history");
    }

    return newHistory;
  }

  async getReadingHistory(): Promise<ReadingHistory[]> {
    const user = await this.database
      .collection<User>(Constant.USER_COLLECTION)
      .findOne(
        { _id: new ObjectId(this.userId) },
        { projection: { readingHistory: 1 } }
      );

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return user.readingHistory || [];
  }

  public async createChapter(
    fictionId: string,
    chapterData: Partial<Chapter>,
    content: File[]
  ) {
    const fiction = await this.database
      .collection<Fiction>(Constant.FICTION_COLLECTION)
      .findOne({ _id: new ObjectId(fictionId) });

    if (!fiction) {
      throw new NotFoundError("Fiction not found");
    }

    if (fiction.author.toString() !== this.userId) {
      throw new ForbiddenError("You are not the author of this fiction");
    }

    const existingChapter = await this.database
      .collection<Chapter>(Constant.CHAPTER_COLLECTION)
      .findOne({
        fiction: new ObjectId(fictionId),
        chapterIndex: chapterData.chapterIndex,
      });

    if (existingChapter) {
      throw new ConflictError("Chapter already exists");
    }

    const newChapter: Chapter = {
      fiction: new ObjectId(fictionId),
      chapterIndex: chapterData.chapterIndex || 0,
      title: chapterData.title || "",
      pageCount: content.length,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.database
      .collection<Chapter>(Constant.CHAPTER_COLLECTION)
      .insertOne(newChapter);

    if (!result.acknowledged) {
      throw new Error("Failed to create chapter");
    }

    // Save content
    await this.saveContent(
      fictionId,
      result.insertedId.toString(),
      content,
      fiction.type === FictionType.PREMIUM
    );

    return result;
  }

  public async getChapter(chapterId: string) {
    const chapter = await this.database
      .collection<Chapter>(Constant.CHAPTER_COLLECTION)
      .findOne({ _id: new ObjectId(chapterId) });

    if (!chapter) {
      throw new NotFoundError("Chapter not found");
    }

    return chapter;
  }

  // public async getContent(fictionId: string, chapterIndex: number) {
  //   const chapter = await this.database
  //     .collection<Chapter>(Constant.CHAPTER_COLLECTION)
  //     .findOne({ fiction: new ObjectId(fictionId), chapterIndex });

  //   return this.getChapterContent(chapter);
  // }

  // private async getChapterContent(chapter: WithId<Chapter>) {
  //   const content = await this.storageService.getFiles(chapter.content);
  //   return content;
  // }

  // Phương thức hỗ trợ để lấy tất cả chapter ID của một fiction
  private async getChapterIdsForFiction(
    fictionId: ObjectId
  ): Promise<ObjectId[]> {
    const chapters = await this.database
      .collection<Chapter>(Constant.CHAPTER_COLLECTION)
      .find({ fiction: fictionId })
      .project({ _id: 1 })
      .toArray();

    return chapters.map((chapter) => chapter._id);
  }
}
