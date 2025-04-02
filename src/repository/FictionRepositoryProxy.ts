import { Fiction, User } from "../model/Entity";
import {
  FictionRepository,
  QueryFictionParams,
  SortField,
  SortOrder,
} from "./FictionRepository";
import { WithId } from "mongodb";

export class FictionRepositoryProxy {
  private repository: FictionRepository;
  private cache: Map<string, any>;
  private cacheTTL: number = 1000 * 60 * 5;
  private cacheTimestamps: Map<string, number>;

  constructor(userId: string) {
    this.repository = new FictionRepository(userId);
    this.cache = new Map();
    this.cacheTimestamps = new Map();
  }

  private getCacheKey(method: string, ...args: any[]): string {
    return `${method}:${JSON.stringify(args)}`;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, data);
    this.cacheTimestamps.set(key, Date.now());
  }

  private getCache<T>(key: string): T | null {
    const timestamp = this.cacheTimestamps.get(key);

    if (!timestamp) return null;

    if (Date.now() - timestamp > this.cacheTTL) {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
      return null;
    }

    return this.cache.get(key) as T;
  }

  private clearCacheForFiction(fictionId: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(fictionId)) {
        this.cache.delete(key);
        this.cacheTimestamps.delete(key);
      }
    }
  }

  async getCurrentUser(): Promise<WithId<User>> {
    return this.repository.getCurrentUser();
  }

  async createFiction(
    fictionData: Partial<Fiction>,
    fictionCover?: File
  ): Promise<WithId<Fiction>> {
    const result = await this.repository.createFiction(
      fictionData,
      fictionCover
    );
    return result;
  }

  async queryFictions(params: QueryFictionParams) {
    const cacheKey = this.getCacheKey("queryFictions", params);
    const cached = this.getCache(cacheKey);

    if (cached) return cached;

    const result = await this.repository.queryFictions(params);
    this.setCache(cacheKey, result);
    return result;
  }

  async getFictionById(fictionId: string): Promise<Fiction | null> {
    const cacheKey = this.getCacheKey("getFictionById", fictionId);
    const cached = this.getCache<Fiction | null>(cacheKey);

    if (cached) return cached;

    const result = await this.repository.getFictionById(fictionId);
    this.setCache(cacheKey, result);
    return result;
  }

  async getFiction(fictionId: string) {
    const cacheKey = this.getCacheKey("getFiction", fictionId);
    const cached = this.getCache(cacheKey);

    if (cached) return cached;

    const result = await this.repository.getFiction(fictionId);
    this.setCache(cacheKey, result);
    return result;
  }

  async updateFiction(
    fictionId: string,
    updateData: Partial<Fiction>
  ): Promise<Fiction | null> {
    const result = await this.repository.updateFiction(fictionId, updateData);
    this.clearCacheForFiction(fictionId);
    return result;
  }

  async deleteFiction(fictionId: string): Promise<boolean> {
    const result = await this.repository.deleteFiction(fictionId);
    this.clearCacheForFiction(fictionId);
    return result;
  }

  async incrementViewCount(fictionId: string): Promise<boolean> {
    const result = await this.repository.incrementViewCount(fictionId);
    this.clearCacheForFiction(fictionId);
    return result;
  }

  async updateRating(fictionId: string, newRating: number): Promise<void> {
    await this.repository.updateRating(fictionId, newRating);
    this.clearCacheForFiction(fictionId);
  }

  async uploadCover(fictionId: string, cover: File): Promise<string> {
    const result = await this.repository.uploadCover(fictionId, cover);
    this.clearCacheForFiction(fictionId);
    return result;
  }

  async favoriteFiction(fictionId: string): Promise<boolean> {
    const result = await this.repository.favoriteFiction(fictionId);
    this.clearCacheForFiction(fictionId);
    return result;
  }

  async getRandomFictions(limit: number = 10) {
    return this.repository.getRandomFictions(limit);
  }
}
