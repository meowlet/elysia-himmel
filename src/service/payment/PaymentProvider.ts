import { TransactionType } from "../../model/Entity";
import { PaymentItem, PaymentService } from "../PaymentService";
import crypto from "crypto";

export interface OrderInfoBase {
  userId: string;
  message: string;
  type: TransactionType;
}

export interface PaymentOptions {
  redirectUrl?: string;
  ipnUrl?: string;
  lang?: string;
}

export interface PaymentProvider {
  createPayment(
    amount: string,
    orderInfo: any,
    options: PaymentOptions,
    paymentItems: PaymentItem[]
  ): Promise<string>;
}

export class MoMoPaymentProvider implements PaymentProvider {
  constructor(private paymentService: PaymentService) {}

  async createPayment(
    amount: string,
    orderInfo: any,
    options: PaymentOptions,
    paymentItems: PaymentItem[] = []
  ): Promise<string> {
    return this.paymentService.createMoMoPayment(
      amount,
      orderInfo,
      options,
      paymentItems
    );
  }
}

export class VNPayPaymentProvider implements PaymentProvider {
  private readonly tmnCode = "FFWVIHJB";
  private readonly secretKey = "VEEIIWC0BTGMDKFBDE8WEGWQXIJD4SFW";

  async createPayment(
    amount: string,
    orderInfo: any,
    options: PaymentOptions,
    paymentItems: PaymentItem[] = []
  ): Promise<string> {
    const vnpAmount = (parseFloat(amount) * 100).toFixed(0);

    const txnRef = `${Date.now()}`;

    const createDate = new Date()
      .toISOString()
      .replace(/[-T:\.Z]/g, "")
      .substring(0, 14);

    const baseUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

    const vnpParams: Record<string, string> = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: this.tmnCode,
      vnp_Amount: vnpAmount,
      vnp_CreateDate: createDate,
      vnp_CurrCode: "VND",
      vnp_IpAddr: "127.0.0.1",
      vnp_Locale: options.lang || "vn",
      vnp_OrderInfo: orderInfo.message || "Payment for order",
      vnp_OrderType: "other",
      vnp_ReturnUrl:
        options.redirectUrl || "https://yourdomain.com/payment/return",
      vnp_TxnRef: txnRef,
    };

    const sortedParams = this.sortObject(vnpParams);

    const signData = new URLSearchParams(sortedParams).toString();

    const hmac = crypto.createHmac("sha512", this.secretKey);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    vnpParams.vnp_SecureHash = signed;

    const finalParams = new URLSearchParams(vnpParams);
    return `${baseUrl}?${finalParams.toString()}`;
  }

  private sortObject(obj: Record<string, any>): Record<string, any> {
    const sorted: Record<string, any> = {};
    const keys = Object.keys(obj).sort();

    for (const key of keys) {
      if (obj[key] !== null && obj[key] !== undefined) {
        sorted[key] = obj[key];
      }
    }

    return sorted;
  }
}
