import Elysia from "elysia";
import { AuthPlugin } from "../plugin/AuthPlugin";
import { createSuccessResponse } from "../model/Response";
import { TransactionRepository } from "../repository/TransactionRepository";
import { TransactionModel } from "../model/TransactionModel";

export const TransactionController = new Elysia()
  .use(AuthPlugin)
  .use(TransactionModel)
  .derive(async ({ userId }) => {
    return {
      repository: new TransactionRepository(userId!),
    };
  })
  .get(
    "/",
    async ({ query, repository }) => {
      const transactions = await repository.getUserTransactions(query);
      return createSuccessResponse(
        "Lấy danh sách giao dịch thành công",
        transactions
      );
    },
    {
      query: "QueryTransactionParams",
    }
  )
  .get("/:transactionId", async ({ params, repository }) => {
    const transaction = await repository.getTransactionById(
      params.transactionId
    );
    return createSuccessResponse(
      "Lấy thông tin giao dịch thành công",
      transaction
    );
  });
