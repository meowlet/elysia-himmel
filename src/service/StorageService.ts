import { Constant } from "../util/Constant";
import { StorageError } from "../util/Error";
import { StorageErrorType } from "../util/Enum";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";

export class StorageService {
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = Constant.UPLOAD_DIRECTORY;
  }

  async saveFile(
    file: File,
    fileName: string,
    directory: string
  ): Promise<string> {
    const fullPath = join(this.uploadDir, directory, fileName);

    await mkdir(join(this.uploadDir, directory), { recursive: true });

    try {
      await Bun.write(fullPath, file);
      return join(directory, fileName);
    } catch (error) {
      throw new StorageError(
        "Cannot save file",
        StorageErrorType.SAVE_FILE_ERROR
      );
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = join(this.uploadDir, filePath);
      await unlink(fullPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw new StorageError(
          "Cannot delete file",
          StorageErrorType.DELETE_FILE_ERROR
        );
      }
    }
  }
  async getFile(filePath: string): Promise<Buffer | null> {
    try {
      const fullPath = join(this.uploadDir, filePath);
      const file = await Bun.file(fullPath).arrayBuffer();
      return Buffer.from(file);
    } catch (error) {
      console.error("Lỗi khi đọc file:", error);
      return null;
    }
  }
}
