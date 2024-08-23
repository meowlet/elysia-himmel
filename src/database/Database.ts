import { Db, MongoClient } from "mongodb";
import { Constant } from "../util/Constant";

export class MongoDatabase {
  private static instance: MongoDatabase;
  private mongoDBUri: string;
  private client: MongoClient | null = null;
  private database: Db | null = null;

  private constructor() {
    this.mongoDBUri = process.env.MONGODB_URI || "mongodb://localhost:27017";
  }

  public static getInstance(): MongoDatabase {
    if (!MongoDatabase.instance) {
      MongoDatabase.instance = new MongoDatabase();
    }
    return MongoDatabase.instance;
  }

  public async connect(dbName: string = "temp"): Promise<void> {
    if (!this.client) {
      this.client = await MongoClient.connect(this.mongoDBUri);
      this.database = this.client.db(dbName);
    }
  }

  public getDatabase(): Db {
    if (!this.database) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.database;
  }

  public async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.database = null;
    }
  }
}

await MongoDatabase.getInstance().connect(Constant.DATABASE_PATH);

export default MongoDatabase.getInstance();
