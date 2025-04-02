import { ObjectId } from "mongodb";
import { Tag } from "../model/Entity";
import { TagFlyweightFactory } from "../util/TagFlyweight";

export class FictionTagService {
  private tagFlyweight: TagFlyweightFactory;

  constructor() {
    this.tagFlyweight = TagFlyweightFactory.getInstance();
  }

  async getTagsForFiction(tagIds: string[] | ObjectId[]): Promise<Tag[]> {
    return await this.tagFlyweight.getTagsByIds(tagIds);
  }

  async resolveTagIds(tagIdentifiers: string[]): Promise<ObjectId[]> {
    const tagIds: ObjectId[] = [];

    for (const identifier of tagIdentifiers) {
      if (ObjectId.isValid(identifier)) {
        const tag = await this.tagFlyweight.getTag(identifier);
        if (tag) {
          tagIds.push(
            tag._id instanceof ObjectId ? tag._id : new ObjectId(tag._id)
          );
        }
      } else {
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
