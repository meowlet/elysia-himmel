import { Db, ObjectId, WithId } from "mongodb";
import { StorageService } from "../service/StorageService";
import { database } from "../database/Database";
import { NotFoundError } from "elysia";
import { Chapter, Fiction } from "../model/Entity";
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
    content: File[]
  ) {
    const savePromises = content.map(async (file, index) => {
      const buffer = await file.arrayBuffer();
      const jpegBuffer = await sharp(buffer).jpeg({ quality: 80 }).toBuffer();

      const imageName = String(index + 1) + ".jpeg";
      const imagePath = path.join(
        "fictions",
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
    await this.saveContent(fictionId, result.insertedId.toString(), content);

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
}
