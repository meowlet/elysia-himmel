import Elysia, { t } from "elysia";
import { createErrorResponse, createSuccessResponse } from "../model/Response";
import { PaymentService } from "../service/PaymentService";
import { MeRepository } from "../repository/MeRepository";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { PaymentModel } from "../model/PaymentModel";
import { PaymentStatus, Transaction } from "../model/Entity";
import { Constant } from "../util/Constant";
import { database } from "../database/Database";
import { Db, ObjectId } from "mongodb";
import { PremiumDuration } from "../model/MeModel";

const MOMO_PARTNER_CODE = Bun.env.MOMO_PARTNER_CODE || "";
const MOMO_ACCESS_KEY = Bun.env.MOMO_ACCESS_KEY || "";
const MOMO_SECRET_KEY = Bun.env.MOMO_SECRET_KEY || "";
const MOMO_ENDPOINT = "https://test-payment.momo.vn/v2/gateway/api/create";

export const PaymentController = new Elysia()
  .derive(() => {
    return {
      paymentService: new PaymentService(),
    };
  })
  .use(PaymentModel)
  .post("/momo-test", async ({ body }) => {
    const orderId = uuidv4();
    const requestId = uuidv4();
    const orderInfo = "Thanh toán test MoMo";
    const redirectUrl = "https://momo.vn/return";
    const ipnUrl = "https://callback.url/notify";
    const amount = "50000";
    const requestType = "captureWallet";
    const extraData = "";

    const rawSignature = `accessKey=${MOMO_ACCESS_KEY}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${MOMO_PARTNER_CODE}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto
      .createHmac("sha256", MOMO_SECRET_KEY)
      .update(rawSignature)
      .digest("hex");

    const requestBody = {
      partnerCode: MOMO_PARTNER_CODE,
      accessKey: MOMO_ACCESS_KEY,
      requestId: requestId,
      amount: amount,
      orderId: orderId,
      orderInfo: orderInfo,
      redirectUrl: redirectUrl,
      ipnUrl: ipnUrl,
      extraData: extraData,
      requestType: requestType,
      signature: signature,
      lang: "vi",
    };

    try {
      const response = await fetch(MOMO_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      return createSuccessResponse(
        "MoMo payment request created",
        responseData
      );
    } catch (error) {
      console.error("Error creating MoMo payment:", error);
      throw new Error("Failed to create MoMo payment request");
    }
  })
  .post(
    "/momo-payment-process",
    async ({ body, paymentService, set }) => {
      set.status = 204;
      const transactionInfo = await database
        .collection(Constant.TRANSACTION_COLLECTION)
        .findOne<Transaction>({
          orderId: body.orderId,
        });

      if (!transactionInfo) {
        return;
      }

      const requestId = body.requestId;

      if (requestId !== transactionInfo.requestId) {
        return;
      }

      if (body.resultCode !== 0) {
        await updateTransactionStatus(
          database,
          transactionInfo.orderId,
          PaymentStatus.FAILED
        );
        return;
      }

      await updateTransactionStatus(
        database,
        transactionInfo.orderId,
        PaymentStatus.SUCCESS
      );

      await updateUserPremiumStatus(
        database,
        transactionInfo.user as string,
        true,
        transactionInfo.premiumDuration as PremiumDuration
      );

      return;
    },
    {
      body: "MomoPaymentProcessRequestBody",
    }
  );

async function updateTransactionStatus(
  database: Db,
  orderId: string,
  status: PaymentStatus
) {
  const transaction = await database
    .collection(Constant.TRANSACTION_COLLECTION)
    .findOne({ orderId: orderId });

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  let updateData = {
    status,
    updatedAt: new Date(),
  };

  await database
    .collection(Constant.TRANSACTION_COLLECTION)
    .updateOne({ orderId: orderId }, { $set: updateData });
}

// update user's premium status
async function updateUserPremiumStatus(
  database: Db,
  userId: string,
  status: boolean,
  duration: PremiumDuration
) {
  const user = await database
    .collection(Constant.USER_COLLECTION)
    .findOne({ _id: new ObjectId(userId) });

  if (!user) {
    throw new Error("User not found");
  }

  let updateData: any = {
    isPremium: status,
    updatedAt: new Date(),
  };

  if (duration) {
    let expiryDate: Date;
    switch (duration) {
      case PremiumDuration.ONE_MONTH:
        expiryDate = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      case PremiumDuration.THREE_MONTH:
        expiryDate = new Date(new Date().getTime() + 90 * 24 * 60 * 60 * 1000);
        break;
      case PremiumDuration.SIX_MONTH:
        expiryDate = new Date(new Date().getTime() + 180 * 24 * 60 * 60 * 1000);
        break;
      case PremiumDuration.ONE_YEAR:
        expiryDate = new Date(new Date().getTime() + 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        throw new Error("Invalid premium duration");
    }
    updateData.premiumExpiryDate = expiryDate;
  }

  await database
    .collection(Constant.USER_COLLECTION)
    .updateOne({ _id: new ObjectId(userId) }, { $set: updateData });
}
