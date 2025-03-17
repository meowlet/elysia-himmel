import { Constant } from "../util/Constant";
import { StorageError } from "../util/Error";
import { StorageErrorType } from "../util/Enum";
import { join } from "path";
import { BunFile } from "bun";
import { unlink } from "node:fs/promises";

export class StorageService {
  private readonly uploadRootDir: string;

  constructor() {
    this.uploadRootDir = Constant.UPLOAD_DIRECTORY;
  }

  async saveFile(file: File, relativePath: string): Promise<string> {
    const fullPath = join(this.uploadRootDir, relativePath);

    try {
      console.log("fullPath", fullPath);
      await Bun.write(fullPath, file);
      return relativePath;
    } catch (error) {
      throw new StorageError(
        "Không thể lưu file",
        StorageErrorType.SAVE_FILE_ERROR
      );
    }
  }

  async saveFileWithTime(file: File, relativePath: string): Promise<string> {
    const directory = join(this.uploadRootDir, relativePath);
    const fileName = `${Date.now()}_${file.name}`;
    const fullPath = join(directory, fileName);

    try {
      await Bun.write(Bun.file(directory), "");
      await Bun.write(fullPath, file);
      return join(relativePath, fileName);
    } catch (error) {
      throw new StorageError(
        "Không thể lưu file",
        StorageErrorType.SAVE_FILE_ERROR
      );
    }
  }

  async getFiles(filePaths: string[]): Promise<(BunFile | null)[]> {
    return Promise.all(filePaths.map((filePath) => this.getFile(filePath)));
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = join(this.uploadRootDir, filePath);
      await unlink(fullPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw new StorageError(
          "Không thể xóa file",
          StorageErrorType.DELETE_FILE_ERROR
        );
      }
    }
  }

  async getFile(filePath: string): Promise<BunFile | null> {
    const fullPath = join(this.uploadRootDir, filePath);
    const file = Bun.file(fullPath);

    try {
      if (await file.exists()) {
        return file;
      }
      return null;
    } catch (error) {
      console.error("Lỗi khi đọc file:", error);
      return null;
    }
  }
}
