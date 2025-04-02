import { Tag } from "../model/Entity";
import { Constant } from "./Constant";
import { database } from "../database/Database";
import { ObjectId } from "mongodb";

export class TagFlyweightFactory {
  private static instance: TagFlyweightFactory;
  private tagCache: Map<string, Tag> = new Map();
  private tagByCodeCache: Map<string, Tag> = new Map();

  private constructor() {
    this.loadAllTags();
  }

  public static getInstance(): TagFlyweightFactory {
    if (!TagFlyweightFactory.instance) {
      TagFlyweightFactory.instance = new TagFlyweightFactory();
    }
    return TagFlyweightFactory.instance;
  }

  private async loadAllTags(): Promise<void> {
    try {
      const tags = await database
        .collection<Tag>(Constant.TAG_COLLECTION)
        .find({ isDeleted: { $ne: true } })
        .toArray();

      tags.forEach((tag) => {
        this.tagCache.set(tag._id.toString(), tag);
        if (tag.code) {
          this.tagByCodeCache.set(tag.code, tag);
        }
      });

      console.log(`Loaded ${tags.length} tags into flyweight cache`);
    } catch (error) {
      console.error("Error loading tags into flyweight cache:", error);
    }
  }

  public async getTag(tagId: string | ObjectId): Promise<Tag | null | any> {
    const id = tagId.toString();

    if (this.tagCache.has(id)) {
      return this.tagCache.get(id) || null;
    }

    try {
      const tag = await database
        .collection<Tag>(Constant.TAG_COLLECTION)
        .findOne({ _id: new ObjectId(id), isDeleted: { $ne: true } });

      if (tag) {
        this.tagCache.set(id, tag);
        if (tag.code) {
          this.tagByCodeCache.set(tag.code, tag);
        }
        return tag;
      }
      return null;
    } catch (error) {
      console.error(`Error retrieving tag ${tagId}:`, error);
      return null;
    }
  }

  public async getTagByCode(code: string): Promise<Tag | null | any> {
    if (this.tagByCodeCache.has(code)) {
      return this.tagByCodeCache.get(code) || null;
    }

    try {
      const tag = await database
        .collection<Tag>(Constant.TAG_COLLECTION)
        .findOne({ code, isDeleted: { $ne: true } });

      if (tag) {
        this.tagCache.set(tag._id.toString(), tag);
        this.tagByCodeCache.set(code, tag);
        return tag;
      }
      return null;
    } catch (error) {
      console.error(`Error retrieving tag by code ${code}:`, error);
      return null;
    }
  }

  public async getTagsByIds(tagIds: Array<string | ObjectId>): Promise<Tag[]> {
    const results: Tag[] = [];
    const missingIds: string[] = [];

    tagIds.forEach((id) => {
      const idStr = id.toString();
      if (this.tagCache.has(idStr)) {
        const tag = this.tagCache.get(idStr);
        if (tag) results.push(tag);
      } else {
        missingIds.push(idStr);
      }
    });

    if (missingIds.length > 0) {
      try {
        const objectIds = missingIds.map((id) => new ObjectId(id));
        const tags = await database
          .collection<Tag>(Constant.TAG_COLLECTION)
          .find({ _id: { $in: objectIds }, isDeleted: { $ne: true } })
          .toArray();

        tags.forEach((tag) => {
          this.tagCache.set(tag._id.toString(), tag);
          if (tag.code) {
            this.tagByCodeCache.set(tag.code, tag);
          }
          results.push(tag);
        });
      } catch (error) {
        console.error("Error fetching missing tags:", error);
      }
    }

    return results;
  }

  public updateTag(tag: Tag): void {
    const id = (tag as any)._id.toString();

    const oldTag = this.tagCache.get(id);
    if (oldTag && oldTag.code && oldTag.code !== tag.code) {
      this.tagByCodeCache.delete(oldTag.code);
    }

    this.tagCache.set(id, tag);
    if (tag.code) {
      this.tagByCodeCache.set(tag.code, tag);
    }
  }

  public removeTag(tagId: string | ObjectId): void {
    const id = tagId.toString();
    const tag = this.tagCache.get(id);

    if (tag && tag.code) {
      this.tagByCodeCache.delete(tag.code);
    }

    this.tagCache.delete(id);
  }

  public async refreshCache(): Promise<void> {
    this.tagCache.clear();
    this.tagByCodeCache.clear();
    await this.loadAllTags();
  }
}
