import Elysia from "elysia";
import { createSuccessResponse } from "../model/Response";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

const MOMO_PARTNER_CODE = Bun.env.MOMO_PARTNER_CODE || "";
const MOMO_ACCESS_KEY = Bun.env.MOMO_ACCESS_KEY || "";
const MOMO_SECRET_KEY = Bun.env.MOMO_SECRET_KEY || "";
const MOMO_ENDPOINT = "https://test-payment.momo.vn/v2/gateway/api/create";

export const PaymentController = new Elysia().post(
  "/momo-test",
  async ({ body }) => {
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
  }
);
