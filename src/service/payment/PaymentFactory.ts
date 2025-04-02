import { PaymentService } from "../PaymentService";
import {
  MoMoPaymentProvider,
  PaymentProvider,
  VNPayPaymentProvider,
} from "./PaymentProvider";

export enum PaymentMethod {
  MOMO = "MOMO",
  VNPAY = "VNPAY",
}

export class PaymentFactory {
  static createPaymentProvider(
    method: PaymentMethod,
    paymentService: PaymentService
  ): PaymentProvider {
    switch (method) {
      case PaymentMethod.MOMO:
        return new MoMoPaymentProvider(paymentService);
      case PaymentMethod.VNPAY:
        return new VNPayPaymentProvider();
      default:
        throw new Error(`Unsupported payment method: ${method}`);
    }
  }
}
