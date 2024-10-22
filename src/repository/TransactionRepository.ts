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
  NOT_SUCCESS = "not-success",
}

export interface QueryTransactionParams {
  status?: TransactionStatus;
  sortBy?: TransactionSortField;
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
      page = 1,
      limit = 10,
    } = params;

    const queryConditions: any = { user: new ObjectId(this.userId) };
    if (status === "success") {
      queryConditions.status = "success";
    } else if (status === "not-success") {
      queryConditions.status = { $ne: "success" };
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
}
