import Elysia, { t } from "elysia";
import { createSuccessResponse } from "../model/Response";
import { PaymentService } from "../service/PaymentService";
import { MeRepository } from "../repository/MeRepository";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { PaymentModel } from "../model/PaymentModel";
import { PaymentStatus } from "../model/Entity";

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
    "/momo-ipn",
    async ({ body, paymentService, set }) => {
      console.log("Got IPN from MoMo:", body);

      // Xác thực chữ ký
      const signature = body.signature;
      delete body.signature;
      const rawSignature = Object.keys(body)
        .sort()
        .map((key) => `${key}=${body[key as keyof typeof body]}`)
        .join("&");

      const computedSignature = crypto
        .createHmac("sha256", MOMO_SECRET_KEY)
        .update(rawSignature)
        .digest("hex");

      if (signature !== computedSignature) {
        console.error("Invalid signature");
        return createSuccessResponse("Invalid signature", null);
      }

      // Kiểm tra trạng thái giao dịch
      if (body.resultCode === 0) {
        // Giao dịch thành công
        const orderId = body.orderId!;
        const amount = body.amount!;
        const transId = body.transId!;

        // Cập nhật trạng thái giao dịch trong cơ sở dữ liệu
        await paymentService.updateTransactionStatus(
          orderId,
          "success",
          transId.toString()
        );

        // Cập nhật trạng thái premium cho người dùng
        const userId = await paymentService.getUserIdFromOrderId(orderId);
        if (userId) {
          const meRepository = new MeRepository(userId);
          await meRepository.updatePremiumStatus(true);
        }

        console.log(`Transaction ${orderId} success, amount: ${amount}`);
      } else {
        // Giao dịch thất bại
        console.log(
          `Transaction ${body.orderId} failed, error code: ${body.resultCode}`
        );
        await paymentService.updateTransactionStatus(
          body.orderId!,
          PaymentStatus.FAILED
        );
      }

      set.status = 204;

      return createSuccessResponse("IPN processed", null);
    },
    {
      body: "MomoRequestBody",
    }
  );
