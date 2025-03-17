import { Elysia, t } from "elysia";
import { GuestTokenRepository } from "../repository/GuestTokenRepository";
import { PremiumDuration } from "../model/MeModel";
import {
  PaymentService,
  GuestPremiumOrderInfo,
} from "../service/PaymentService";
import { Constant } from "../util/Constant";
import { TransactionType } from "../model/Entity";
import { createSuccessResponse } from "../model/Response";
import { MeRepository } from "../repository/MeRepository";

export const GuestPremiumController = new Elysia()
  .model({
    GuestPremiumBody: t.Object({
      duration: t.Enum(PremiumDuration, {
        error: "Invalid duration",
      }),
      email: t.Optional(
        t.String({
          format: "email",
          error: "Invalid email format",
        })
      ),
    }),
  })
  .post(
    "/purchase",
    async ({ body }) => {
      const meRepository = new MeRepository("guest");

      const paymentUrl = await meRepository.getGuestPaymentUrl(
        body.duration,
        body.email
      );

      return createSuccessResponse("Redirect to payment", {
        paymentUrl: paymentUrl,
      });
    },
    {
      body: "GuestPremiumBody",
    }
  )
  // restore purchase for guest
  .post(
    "/restore",
    async ({ body }) => {
      const guestTokenRepository = new GuestTokenRepository();

      guestTokenRepository.resendGuestToken(body.email);

      return createSuccessResponse(
        "If the email is valid, we will send the premium token to the email",
        {
          email: body.email,
        }
      );
    },
    {
      body: t.Object({
        email: t.String({
          format: "email",
          error: "Invalid email format",
        }),
      }),
    }
  )
  .get("/validate/:token", async ({ params }) => {
    const guestTokenRepository = new GuestTokenRepository();
    const token = params.token;
    const isValid = await guestTokenRepository.validateGuestToken(token);
    const expiryDate = await guestTokenRepository.getTokenExpiryDate(
      params.token
    );

    return createSuccessResponse("Token validation", {
      isValid,
      premiumToken: token,
      expiryDate,
    });
  });

function getPremiumAmount(duration: PremiumDuration): string {
  const amounts = {
    [PremiumDuration.ONE_MONTH]: "5000",
    [PremiumDuration.THREE_MONTH]: "14000",
    [PremiumDuration.SIX_MONTH]: "26000",
    [PremiumDuration.ONE_YEAR]: "50000",
  };
  return (
    amounts[duration] ||
    (() => {
      throw new Error("Invalid duration");
    })()
  );
}
