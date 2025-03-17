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

export interface GuestPremiumOrderInfo extends OrderInfo {
  duration: PremiumDuration;
  email?: string; // Optional email for receipt
}

export class PaymentService {
  private database = database;

  async createMoMoPayment(
    amount: string,
    orderInfo: PremiumOrderInfo | AuthorPayoutOrderInfo,
    options: {
      redirectUrl?: string;
      ipnUrl?: string;
      lang?: string;
    } = {},
    paymentItems: PaymentItem[] = []
  ): Promise<string> {
    const orderId = new ObjectId().toString();
    const requestId = new ObjectId().toString();

    const {
      redirectUrl = Constant.MOMO_REDIRECT_URL,
      ipnUrl = Constant.MOMO_IPN_URL,
      lang = "vi",
    } = options;

    const requestBody = this.createMoMoRequestBody({
      amount,
      orderId,
      requestId,
      redirectUrl,
      ipnUrl,
      orderInfo: orderInfo.message,
      items: paymentItems,
      lang,
    });

    console.log(orderId);

    const payUrl = await this.sendMoMoRequest(requestBody);
    await this.saveTransaction(orderId, requestId, amount, orderInfo);
    return payUrl;
  }

  async createGuestPremiumPayment(
    amount: string,
    orderInfo: GuestPremiumOrderInfo,
    options: {
      redirectUrl?: string;
      ipnUrl?: string;
      lang?: string;
    } = {},
    paymentItems: PaymentItem[] = []
  ): Promise<string> {
    const orderId = new ObjectId().toString();
    const requestId = new ObjectId().toString();

    const {
      redirectUrl = Constant.MOMO_GUEST_REDIRECT_URL,
      ipnUrl = Constant.MOMO_IPN_URL,
      lang = "en",
    } = options;

    const requestBody = this.createMoMoRequestBody({
      amount,
      orderId,
      requestId,
      redirectUrl,
      ipnUrl,
      orderInfo: orderInfo.message,
      items: paymentItems,
      lang,
    });

    const payUrl = await this.sendMoMoRequest(requestBody);
    await this.saveGuestTransaction(orderId, requestId, amount, orderInfo);
    return payUrl;
  }

  private createMoMoRequestBody(params: {
    amount: string;
    orderId: string;
    requestId: string;
    redirectUrl: string;
    ipnUrl: string;
    orderInfo: string;
    items: PaymentItem[];
    lang: string;
  }): any {
    const {
      amount,
      orderId,
      requestId,
      redirectUrl,
      ipnUrl,
      orderInfo,
      items,
      lang,
    } = params;
    const requestType = "captureWallet";
    const extraData = "";
    const storeName = Constant.STORE_NAME;

    const rawSignature = this.createRawSignature({
      accessKey: Constant.MOMO_ACCESS_KEY,
      amount,
      ipnUrl,
      orderId,
      orderInfo,
      partnerCode: Constant.MOMO_PARTNER_CODE,
      redirectUrl,
      requestId,
      requestType,
      extraData,
    });

    const signature = this.createSignature(rawSignature);

    return {
      partnerCode: Constant.MOMO_PARTNER_CODE,
      accessKey: Constant.MOMO_ACCESS_KEY,
      requestId,
      storeName,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      items,
      requestType,
      signature,
      lang,
      extraData,
    };
  }

  public createRawSignature(params: Record<string, string>): string {
    return Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
  }

  public createSignature(rawSignature: string): string {
    return crypto
      .createHmac("sha256", Constant.MOMO_SECRET_KEY)
      .update(rawSignature)
      .digest("hex");
  }

  private async sendMoMoRequest(data: any): Promise<string> {
    const response = await fetch(Constant.MOMO_ENDPOINT + "/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const responseData = await response.json();

    console.log(responseData);

    if (responseData.payUrl) {
      return responseData.payUrl;
    }
    throw new Error("Failed to create MoMo payment");
  }

  private async saveTransaction(
    orderId: string,
    requestId: string,
    amount: string,
    orderInfo: PremiumOrderInfo | AuthorPayoutOrderInfo
  ): Promise<void> {
    await this.database.collection(Constant.TRANSACTION_COLLECTION).insertOne({
      user: new ObjectId(orderInfo.userId),
      amount,
      requestId,
      type: orderInfo.type,
      orderInfo: orderInfo.message,
      status: PaymentStatus.PENDING,
      orderId,
      premiumDuration: (orderInfo as PremiumOrderInfo)?.duration,
      authorId: (orderInfo as AuthorPayoutOrderInfo)?.authorId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  private async saveGuestTransaction(
    orderId: string,
    requestId: string,
    amount: string,
    orderInfo: GuestPremiumOrderInfo
  ): Promise<void> {
    await this.database.collection(Constant.TRANSACTION_COLLECTION).insertOne({
      amount,
      requestId,
      type: TransactionType.GUEST_PREMIUM_SUBSCRIPTION,
      orderInfo: orderInfo.message,
      status: PaymentStatus.PENDING,
      orderId,
      premiumDuration: orderInfo.duration,
      email: orderInfo.email,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
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
