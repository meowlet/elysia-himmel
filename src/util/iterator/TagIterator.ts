import { Tag } from "../../model/Entity";

export interface TagIterator {
  hasNext(): boolean;
  next(): Tag;
  reset(): void;
  current(): Tag | null;
}

export class ArrayTagIterator implements TagIterator {
  private position: number = 0;

  constructor(private tags: Tag[]) {}

  hasNext(): boolean {
    return this.position < this.tags.length;
  }

  next(): Tag {
    if (!this.hasNext()) {
      throw new Error("No more tags to iterate");
    }
    return this.tags[this.position++];
  }

  reset(): void {
    this.position = 0;
  }

  current(): Tag | null {
    if (this.position >= this.tags.length || this.position < 0) {
      return null;
    }
    return this.tags[this.position];
  }
}
