import { ObjectId } from "mongodb";
import { Tag } from "../model/Entity";
import { TagFlyweightFactory } from "../util/TagFlyweight";

/**
 * Service to handle fiction tag operations using the flyweight pattern
 */
export class FictionTagService {
  private tagFlyweight: TagFlyweightFactory;

  constructor() {
    this.tagFlyweight = TagFlyweightFactory.getInstance();
  }

  /**
   * Get all tags for a fiction by tag IDs
   */
  async getTagsForFiction(tagIds: string[] | ObjectId[]): Promise<Tag[]> {
    return await this.tagFlyweight.getTagsByIds(tagIds);
  }

  /**
   * Resolve tag IDs from a mix of IDs and tag codes
   * Useful when creating/updating fictions with tags specified by code
   */
  async resolveTagIds(tagIdentifiers: string[]): Promise<ObjectId[]> {
    const tagIds: ObjectId[] = [];

    for (const identifier of tagIdentifiers) {
      // Check if the identifier is already an ObjectId
      if (ObjectId.isValid(identifier)) {
        // It's an ID
        const tag = await this.tagFlyweight.getTag(identifier);
        if (tag) {
          tagIds.push(
            tag._id instanceof ObjectId ? tag._id : new ObjectId(tag._id)
          );
        }
      } else {
        // It's a code
        const tag = await this.tagFlyweight.getTagByCode(identifier);
        if (tag) {
          tagIds.push(
            tag._id instanceof ObjectId ? tag._id : new ObjectId(tag._id)
          );
        }
      }
    }

    return tagIds;
  }
}
