import { NotFoundError } from "elysia";
import { User } from "../../model/Entity";
import { ForbiddenError } from "../../util/Error";
import { join } from "path";

export abstract class ChapterService {
  abstract getChapterPage(
    fictionId: string,
    chapterId: string,
    pageIndex: number
  ): any;
}

export class RegularChapterService extends ChapterService {
  async getChapterPage(
    fictionId: string,
    chapterId: string,
    pageIndex: number
  ): Promise<any> {
    const path = join(
      "public",
      "fictions",
      fictionId,
      "chapters",
      chapterId,
      `${pageIndex}.jpeg`
    );

    const file = Bun.file(path);

    if (!(await file.exists())) {
      throw new NotFoundError("Chapter page not found");
    }

    return file;
  }
}

export class PremiumChapterService extends ChapterService {
  async getChapterPage(
    fictionId: string,
    chapterId: string,
    pageIndex: number
  ): Promise<any> {
    const path = join(
      "public",
      "premium-fictions",
      fictionId,
      "chapters",
      chapterId,
      `${pageIndex}.jpeg`
    );

    const file = Bun.file(path);

    if (!(await file.exists())) {
      throw new NotFoundError("Chapter page not found");
    }

    return file;
  }
}

export abstract class ChapterServiceDecorator extends ChapterService {
  constructor(protected chapterService: ChapterService) {
    super();
  }

  abstract getChapterPage(
    fictionId: string,
    chapterId: string,
    pageIndex: number
  ): any;
}

export class PremiumAccessDecorator extends ChapterServiceDecorator {
  constructor(chapterService: ChapterService, private user: User) {
    super(chapterService);
  }

  async getChapterPage(
    fictionId: string,
    chapterId: string,
    pageIndex: number
  ): Promise<any> {
    if (!this.user.isPremium) {
      throw new ForbiddenError("You must be premium to access this chapter");
    }

    return this.chapterService.getChapterPage(fictionId, chapterId, pageIndex);
  }
}

export class ChapterServiceFactory {
  static createChapterService(
    isPremiumContent: boolean,
    user?: User
  ): ChapterService {
    let service: ChapterService;

    if (isPremiumContent) {
      service = new PremiumChapterService();
      if (user) {
        service = new PremiumAccessDecorator(service, user);
      }
    } else {
      service = new RegularChapterService();
    }

    return service;
  }
}
