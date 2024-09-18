import crypto from "crypto";
import { ObjectId } from "mongodb";
import { v4 as uuidv4 } from "uuid";
import { Constant } from "../util/Constant";
import { database } from "../database/Database";

export class PaymentService {
  private MOMO_PARTNER_CODE = Bun.env.MOMO_PARTNER_CODE || "";
  private MOMO_ACCESS_KEY = Bun.env.MOMO_ACCESS_KEY || "";
  private MOMO_SECRET_KEY = Bun.env.MOMO_SECRET_KEY || "";
  private MOMO_ENDPOINT = "https://test-payment.momo.vn/v2/gateway/api/create";
  private database = database;

  async createMoMoPayment(amount: string, orderInfo: string): Promise<string> {
    const orderId = new ObjectId().toHexString();
    const requestId = new ObjectId().toHexString();
    const redirectUrl = `${Constant.FE_URL}/api/payment/momo-callback`;
    const ipnUrl = `${Constant.BE_URL}/api/payment/momo-ipn`;
    const requestType = "captureWallet";
    const extraData = "";

    const rawSignature = `accessKey=${this.MOMO_ACCESS_KEY}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${this.MOMO_PARTNER_CODE}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto
      .createHmac("sha256", this.MOMO_SECRET_KEY)
      .update(rawSignature)
      .digest("hex");

    const requestBody = {
      partnerCode: this.MOMO_PARTNER_CODE,
      accessKey: this.MOMO_ACCESS_KEY,
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
      const response = await fetch(this.MOMO_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (responseData.payUrl) {
        return responseData.payUrl;
      } else {
        throw new Error("Failed to create MoMo payment");
      }
    } catch (error) {
      console.error("Failed to create MoMo payment:", error);
      throw new Error("Failed to create MoMo payment");
    }
  }

  async updateTransactionStatus(
    orderId: string,
    status: "success" | "failed",
    transId?: string
  ) {
    // Cập nhật trạng thái giao dịch trong cơ sở dữ liệu
    await this.database.collection(Constant.TRANSACTION_COLLECTION).updateOne(
      { orderId },
      {
        $set: {
          status,
          transId,
          updatedAt: new Date(),
        },
      }
    );
  }

  async getUserIdFromOrderId(orderId: string): Promise<string | null> {
    const transaction = await this.database
      .collection(Constant.TRANSACTION_COLLECTION)
      .findOne({ orderId });
    return transaction ? transaction.userId : null;
  }
}
