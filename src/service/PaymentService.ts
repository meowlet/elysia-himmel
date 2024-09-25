import crypto from "crypto";
import { ObjectId } from "mongodb";
import { v4 as uuidv4 } from "uuid";
import { Constant } from "../util/Constant";
import { database } from "../database/Database";
import { PremiumDuration } from "../model/MeModel";
import { PaymentStatus, TransactionType } from "../model/Entity";

export interface PaymentItem {
  id?: string; // SKU number
  name?: string; // Tên sản phẩm
  description?: string; // Miêu tả sản phẩm
  category?: string; // Phân loại ngành hàng của sản phẩm
  imageUrl?: string; // Link hình ảnh của sản phẩm
  manufacturer?: string; // Tên nhà sản xuất
  price: number; // Đơn giá (sử dụng number thay vì Long)
  currency: string; // VND
  quantity: number; // Số lượng của sản phẩm. Cần là một số lớn hơn 0
  unit?: string; // Đơn vị đo lường của sản phẩm này
  totalPrice: number; // Tổng giá = Đơn giá x Số lượng
  taxAmount?: number; // Tổng thuế
}

interface OrderInfo {
  userId: string;
  message: string;
  type: TransactionType;
}

export interface PremiumOrderInfo extends OrderInfo {
  duration: PremiumDuration;
}

interface AuthorPayoutOrderInfo extends OrderInfo {
  authorId: string;
}

export class PaymentService {
  private database = database;

  async createMoMoPayment(
    amount: string,
    orderInfo: PremiumOrderInfo | AuthorPayoutOrderInfo,
    options?: {
      redirectUrl?: string;
      ipnUrl?: string;
      lang?: string;
    },
    paymentItems?: PaymentItem[]
  ): Promise<string> {
    const orderId = new ObjectId().toString();
    const requestId = new ObjectId().toString();
    const redirectUrl =
      options?.redirectUrl || Constant.FE_URL + "/payment/momo-callback";
    const ipnUrl = options?.ipnUrl || Constant.BE_URL + "/api/payment/momo-ipn";
    const requestType = "captureWallet";
    const items = paymentItems || [];
    const lang = options?.lang || "vi";

    const rawSignature = this.createRawSignature({
      accessKey: Constant.MOMO_ACCESS_KEY,
      amount,
      ipnUrl,
      orderId,
      orderInfo: orderInfo.message,
      partnerCode: Constant.MOMO_PARTNER_CODE,
      redirectUrl,
      requestId,
      requestType,
    });

    const signature = this.createSignature(rawSignature);

    const requestBody = {
      partnerCode: Constant.MOMO_PARTNER_CODE,
      accessKey: Constant.MOMO_ACCESS_KEY,
      requestId,
      amount,
      orderId,
      orderInfo: orderInfo.message,
      redirectUrl,
      ipnUrl,
      items,
      requestType,
      signature,
      lang,
    };

    const payUrl = await this.sendMoMoRequest(requestBody);
    await this.database.collection(Constant.TRANSACTION_COLLECTION).insertOne({
      userId: orderInfo.userId,
      amount,
      type: orderInfo.type,
      orderInfo: orderInfo.message,
      status: PaymentStatus.PENDING,
      orderId,
      premiumDuration: (orderInfo as PremiumOrderInfo)?.duration,
      authorId: (orderInfo as AuthorPayoutOrderInfo)?.authorId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return payUrl;
  }

  private createRawSignature(params: Record<string, string>): string {
    return Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
  }

  private createSignature(rawSignature: string): string {
    return crypto
      .createHmac("sha256", Constant.MOMO_SECRET_KEY)
      .update(rawSignature)
      .digest("hex");
  }

  private async sendMoMoRequest(data: {
    partnerCode: string;
    accessKey: string;
    requestId: string;
    amount: string;
    orderId: string;
    orderInfo: string;
    redirectUrl: string;
    ipnUrl: string;
    items: PaymentItem[];
    requestType: string;
    extraData?: string;
    signature: string;
    lang?: string;
  }): Promise<any> {
    try {
      const response = await fetch(Constant.MOMO_ENDPOINT + "/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      console.log(JSON.stringify(data));

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

  async updateTransactionStatus(orderId: string, status: PaymentStatus) {
    const transaction = await this.database
      .collection(Constant.TRANSACTION_COLLECTION)
      .findOne({ _id: new ObjectId(orderId) });

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    let updateData = {
      status,
      updatedAt: new Date(),
    };

    await this.database
      .collection(Constant.TRANSACTION_COLLECTION)
      .updateOne({ _id: new ObjectId(orderId) }, { $set: updateData });
  }

  async getUserIdFromOrderId(orderId: string): Promise<string | null> {
    const transaction = await this.database
      .collection(Constant.TRANSACTION_COLLECTION)
      .findOne({ orderId });
    return transaction ? transaction.userId : null;
  }
}
