import { Db, ObjectId } from "mongodb";
import { database } from "../database/Database";
import { Constant } from "../util/Constant";
import { Transaction } from "../model/Entity";

export enum TransactionSortField {
  AMOUNT = "amount",
  CREATED_AT = "createdAt",
}

export enum TransactionStatus {
  SUCCESS = "success",
  FAILED = "failed",
  PENDING = "pending",
}

export interface QueryTransactionParams {
  status?: TransactionStatus;
  sortBy?: TransactionSortField;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export interface QueryTransactionResult {
  transactions: Transaction[];
  total: number;
}

export class TransactionRepository {
  private database: Db;

  constructor(private userId: string) {
    this.database = database;
  }

  async getUserTransactions(
    params: QueryTransactionParams = {}
  ): Promise<QueryTransactionResult> {
    const {
      status,
      sortBy = TransactionSortField.CREATED_AT,
      from,
      to,
      page = 1,
      limit = 10,
    } = params;

    const queryConditions: any = { user: new ObjectId(this.userId) };

    // Add status filter
    if (status === "success") {
      queryConditions.status = "success";
    } else if (status === "pending") {
      queryConditions.status = "pending";
    } else if (status === "failed") {
      queryConditions.status = "failed";
    }

    // Add date range filter
    if (from || to) {
      queryConditions.createdAt = {};

      if (from) {
        queryConditions.createdAt.$gte = from;
      }

      if (to) {
        queryConditions.createdAt.$lte = to;
      }
    }

    const sort: { [key: string]: -1 } = { [sortBy]: -1 };

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.database
        .collection<Transaction>(Constant.TRANSACTION_COLLECTION)
        .find(queryConditions)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.database
        .collection<Transaction>(Constant.TRANSACTION_COLLECTION)
        .countDocuments(queryConditions),
    ]);

    return { transactions, total };
  }

  async getTransactionById(transactionId: string): Promise<Transaction | null> {
    return await this.database
      .collection<Transaction>(Constant.TRANSACTION_COLLECTION)
      .findOne({
        _id: new ObjectId(transactionId),
        user: new ObjectId(this.userId),
      });
  }
  async getAllTransactionsByQuery(query: QueryTransactionParams = {}) {
    const {
      status,
      sortBy = TransactionSortField.CREATED_AT,
      from,
      to,
      page = 1,
      limit = 10,
    } = query;

    const queryConditions: any = {};

    // Add status filter
    if (status === "success") {
      queryConditions.status = "success";
    } else if (status === "failed") {
      queryConditions.status = "failed";
    } else if (status === "pending") {
      queryConditions.status = "pending";
    }

    // Add date range filter
    if (from || to) {
      queryConditions.createdAt = {};

      if (from) {
        queryConditions.createdAt.$gte = from;
      }

      if (to) {
        queryConditions.createdAt.$lte = to;
      }
    }

    const sort: { [key: string]: -1 } = { [sortBy]: -1 };

    const skip = (page - 1) * limit;
    console.log(query);

    // Use aggregation pipeline to include user details
    const aggregationPipeline = [
      { $match: queryConditions },
      { $sort: sort },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: Constant.USER_COLLECTION, // Assuming you have a user collection constant
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
    ];

    const [transactions, total] = await Promise.all([
      this.database
        .collection<Transaction>(Constant.TRANSACTION_COLLECTION)
        .aggregate(aggregationPipeline)
        .toArray(),
      this.database
        .collection<Transaction>(Constant.TRANSACTION_COLLECTION)
        .countDocuments(queryConditions),
    ]);

    return { transactions, total };
  }
}
