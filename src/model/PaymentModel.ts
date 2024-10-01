import Elysia, { t } from "elysia";

//curl --location 'https://example.com/momo_ip' \
// --header 'Content-Type: application/json' \
// --data '{
//     "orderType": "momo_wallet",
//     "amount": 1000,
//     "partnerCode": "MOMOT5BZ20231213_TEST",
//     "orderId": "Partner_Transaction_ID_1721720620078",
//     "extraData": "eyJza3VzIjoiIn0=",
//     "signature": "7b9f4ca728076c32f16041cbc917ebf5e6e7359f0bde343dde3add69a518cf0d",
//     "transId": 4088878653,
//     "responseTime": 1721720663942,
//     "resultCode": 0,
//     "message": "Successful.",
//     "payType": "qr",
//     "requestId": "Request_ID_1721720620078",
//     "orderInfo": "Thank you for your purchase at MoMo_test"
// }'
export const PaymentModel = new Elysia().model({
  MomoPaymentProcessRequestBody: t.Object({
    partnerCode: t.String(),
    orderId: t.String(),
    requestId: t.String(),
    amount: t.Number(),
    orderInfo: t.String(),
    orderType: t.String(),
    transId: t.Number(),
    resultCode: t.Number(),
    message: t.String(),
    payType: t.String(),
    responseTime: t.Number(),
    extraData: t.String(),
    signature: t.String(),
  }),
});
