import { Constant } from "../util/Constant";

export interface PaymentGateway {
  createPayment(
    amount: number,
    orderId: string,
    description: string
  ): Promise<PaymentResponse>;
  verifyPayment(requestData: any): Promise<VerificationResponse>;
  getRedirectUrl(paymentData: PaymentResponse): string;
}

export interface PaymentResponse {
  success: boolean;
  paymentUrl?: string;
  transactionId?: string;
  message?: string;
  rawResponse?: any;
}

export interface VerificationResponse {
  success: boolean;
  verified: boolean;
  amount?: number;
  orderId?: string;
  transactionId?: string;
  message?: string;
  rawResponse?: any;
}

export class MomoPaymentGateway implements PaymentGateway {
  private partnerCode: string;
  private accessKey: string;
  private secretKey: string;
  private endpointUrl: string;
  private redirectUrl: string;
  private ipnUrl: string;

  constructor(isGuest: boolean = false) {
    this.partnerCode = Constant.MOMO_PARTNER_CODE;
    this.accessKey = Constant.MOMO_ACCESS_KEY;
    this.secretKey = Constant.MOMO_SECRET_KEY;
    this.endpointUrl = Constant.MOMO_ENDPOINT;

    if (isGuest) {
      this.redirectUrl = Constant.MOMO_GUEST_REDIRECT_URL;
      this.ipnUrl = Constant.MOMO_GUEST_IPN_URL;
    } else {
      this.redirectUrl = Constant.MOMO_REDIRECT_URL;
      this.ipnUrl = Constant.MOMO_IPN_URL;
    }
  }

  async createPayment(
    amount: number,
    orderId: string,
    description: string
  ): Promise<PaymentResponse> {
    try {
      const requestId = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const requestTime = Date.now();

      const requestData = {
        partnerCode: this.partnerCode,
        accessKey: this.accessKey,
        requestId: requestId,
        amount: amount,
        orderId: orderId,
        orderInfo: description,
        redirectUrl: this.redirectUrl,
        ipnUrl: this.ipnUrl,
        requestType: "captureWallet",
        extraData: "",
        lang: "vi",
      };

      const rawSignature = this.generateSignature(requestData);
      const requestBody = {
        ...requestData,
        signature: rawSignature,
      };

      const response = await fetch(`${this.endpointUrl}/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (responseData.resultCode === 0) {
        return {
          success: true,
          paymentUrl: responseData.payUrl,
          transactionId: responseData.requestId,
          rawResponse: responseData,
        };
      } else {
        return {
          success: false,
          message: responseData.message || "Payment creation failed",
          rawResponse: responseData,
        };
      }
    } catch (error) {
      console.error("Error creating Momo payment:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async verifyPayment(requestData: any): Promise<VerificationResponse> {
    try {
      const receivedSignature = requestData.signature;
      const calculatedSignature = this.generateSignature(requestData);

      const isSignatureValid = receivedSignature === calculatedSignature;
      const isSuccess = requestData.resultCode === 0;

      return {
        success: true,
        verified: isSignatureValid && isSuccess,
        amount: requestData.amount,
        orderId: requestData.orderId,
        transactionId: requestData.transId,
        message: isSignatureValid ? requestData.message : "Invalid signature",
        rawResponse: requestData,
      };
    } catch (error) {
      console.error("Error verifying Momo payment:", error);
      return {
        success: false,
        verified: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  getRedirectUrl(paymentData: PaymentResponse): string {
    return paymentData.paymentUrl || "";
  }

  private generateSignature(data: any): string {
    const { signature, lang, ...signData } = data;

    const sortedKeys = Object.keys(signData).sort();
    const signatureData = sortedKeys
      .map((key) => `${key}=${signData[key]}`)
      .join("&");

    const hmacObj = new Bun.CryptoHasher("sha256", this.secretKey);
    hmacObj.update(signatureData);
    return hmacObj.digest("hex");
  }
}

export class PayPalPaymentGateway implements PaymentGateway {
  constructor() {}

  async createPayment(
    amount: number,
    orderId: string,
    description: string
  ): Promise<PaymentResponse> {
    console.log(`Creating PayPal payment: ${amount} for ${orderId}`);
    return {
      success: true,
      paymentUrl: `https://paypal.com/checkout?amount=${amount}&order=${orderId}`,
      transactionId: `PP-${Date.now()}`,
    };
  }

  async verifyPayment(requestData: any): Promise<VerificationResponse> {
    return {
      success: true,
      verified: true,
      amount: requestData.amount,
      orderId: requestData.orderId,
      transactionId: requestData.transactionId,
    };
  }

  getRedirectUrl(paymentData: PaymentResponse): string {
    return paymentData.paymentUrl || "";
  }
}

export class PaymentGatewayFactory {
  static createPaymentGateway(
    gatewayType: "momo" | "paypal",
    options: { isGuest?: boolean } = {}
  ): PaymentGateway {
    switch (gatewayType) {
      case "momo":
        return new MomoPaymentGateway(options.isGuest);
      case "paypal":
        return new PayPalPaymentGateway();
      default:
        throw new Error(`Unsupported payment gateway: ${gatewayType}`);
    }
  }
}
