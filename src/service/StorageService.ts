import { Constant } from "../util/Constant";
import { StorageError } from "../util/Error";
import { StorageErrorType } from "../util/Enum";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";

export class StorageService {
  private readonly uploadRootDir: string;

  constructor() {
    this.uploadRootDir = Constant.UPLOAD_DIRECTORY;
  }

  async saveFile(file: File, relativePath: string): Promise<string> {
    const fullPath = join(this.uploadRootDir, relativePath);
    const directory = fullPath.substring(0, fullPath.lastIndexOf("/"));

    try {
      await mkdir(directory, { recursive: true });
      await Bun.write(fullPath, file);
      return relativePath;
    } catch (error) {
      throw new StorageError(
        "Cannot save file",
        StorageErrorType.SAVE_FILE_ERROR
      );
    }
  }

  async saveFileWithTime(file: File, relativePath: string): Promise<string> {
    const fullPath = join(this.uploadRootDir, relativePath);
    const directory = fullPath.substring(0, fullPath.lastIndexOf("/"));

    try {
      await mkdir(directory, { recursive: true });
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = join(directory, fileName);
      await Bun.write(filePath, file);
      return join(relativePath, fileName);
    } catch (error) {
      throw new StorageError(
        "Cannot save file",
        StorageErrorType.SAVE_FILE_ERROR
      );
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = join(this.uploadRootDir, filePath);
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

  async getFile(
    filePath: string
  ): Promise<{ data: Buffer; mimeType: string } | null> {
    try {
      const fullPath = `${this.uploadRootDir}/${filePath}`;
      const file = await Bun.file(fullPath);
      const data = Buffer.from(await file.arrayBuffer());
      const mimeType = file.type;
      return { data, mimeType };
    } catch (error) {
      console.error("Lỗi khi đọc file:", error);
      return null;
    }
  }
}
