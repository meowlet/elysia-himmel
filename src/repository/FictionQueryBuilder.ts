import { ObjectId } from "mongodb";
import { Fiction, FictionStatus, FictionType } from "../model/Entity";
import { SortField, SortOrder } from "./FictionRepository";

export class FictionQueryBuilder {
  private queryConditions: any = {};
  private sortOptions: { [key: string]: 1 | -1 } = {};
  private skipValue: number = 0;
  private limitValue: number = 12;

  withTextSearch(query?: string): FictionQueryBuilder {
    if (query) {
      this.queryConditions.$or = [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ];
    }
    return this;
  }

  withAuthor(author?: string): FictionQueryBuilder {
    if (author) {
      this.queryConditions.author = new ObjectId(author);
    }
    return this;
  }

  withTags(tags?: string[]): FictionQueryBuilder {
    if (tags && tags.length > 0) {
      this.queryConditions.tags = {
        $all: tags.map((tag) => new ObjectId(tag)),
      };
    }
    return this;
  }

  withStatus(status?: FictionStatus): FictionQueryBuilder {
    if (status) {
      this.queryConditions.status = status;
    }
    return this;
  }

  withType(type?: FictionType): FictionQueryBuilder {
    if (type) {
      this.queryConditions.type = type;
    }
    return this;
  }

  withDateRange(from?: Date | null, to?: Date | null): FictionQueryBuilder {
    if (from || to) {
      this.queryConditions.createdAt = {};
      if (from) this.queryConditions.createdAt.$gte = from;
      if (to) this.queryConditions.createdAt.$lte = to;
    }
    return this;
  }

  withMinViewCount(count?: number): FictionQueryBuilder {
    if (count) {
      this.queryConditions["stats.viewCount"] = { $gte: count };
    }
    return this;
  }

  withMinRating(rating?: number): FictionQueryBuilder {
    if (rating) {
      this.queryConditions["stats.averageRating"] = { $gte: rating };
    }
    return this;
  }

  withSort(
    sortBy: SortField = SortField.CREATED_AT,
    sortOrder: SortOrder = SortOrder.DESC
  ): FictionQueryBuilder {
    if (sortBy === SortField.VIEW_COUNT) {
      this.sortOptions["stats.viewCount"] =
        sortOrder === SortOrder.DESC ? -1 : 1;
    } else if (sortBy === SortField.AVERAGE_RATING) {
      this.sortOptions["stats.averageRating"] =
        sortOrder === SortOrder.DESC ? -1 : 1;
    } else if (sortBy === SortField.FAVORITE_COUNT) {
      this.sortOptions["stats.favoriteCount"] =
        sortOrder === SortOrder.DESC ? -1 : 1;
    } else {
      this.sortOptions[sortBy] = sortOrder === SortOrder.DESC ? -1 : 1;
    }
    return this;
  }

  withPagination(page: number = 1, limit: number = 12): FictionQueryBuilder {
    this.skipValue = (page - 1) * limit;
    this.limitValue = limit;
    return this;
  }

  build() {
    return {
      query: this.queryConditions,
      sort: this.sortOptions,
      skip: this.skipValue,
      limit: this.limitValue,
    };
  }

  static fromQueryParams(params: {
    query?: string;
    author?: string;
    tags?: string[];
    status?: FictionStatus;
    type?: FictionType;
    createdFrom?: Date | null;
    createdTo?: Date | null;
    sortBy?: SortField;
    sortOrder?: SortOrder;
    page?: number;
    limit?: number;
    minViewCount?: number;
    minRating?: number;
  }): FictionQueryBuilder {
    return new FictionQueryBuilder()
      .withTextSearch(params.query)
      .withAuthor(params.author)
      .withTags(params.tags)
      .withStatus(params.status)
      .withType(params.type)
      .withDateRange(params.createdFrom, params.createdTo)
      .withMinViewCount(params.minViewCount)
      .withMinRating(params.minRating)
      .withSort(params.sortBy, params.sortOrder)
      .withPagination(params.page, params.limit);
  }
}
