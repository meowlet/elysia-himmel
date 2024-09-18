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
  MomoRequestBody: t.Object({
    orderType: t.Optional(t.String()),
    amount: t.Optional(t.Number()),
    partnerCode: t.Optional(t.String()),
    orderId: t.Optional(t.String()),
    extraData: t.String(),
    signature: t.Optional(t.String()),
    transId: t.Optional(t.Number()),
    responseTime: t.Optional(t.Number()),
    resultCode: t.Optional(t.Number()),
    message: t.Optional(t.String()),
    payType: t.Optional(t.String()),
    requestId: t.Optional(t.String()),
    orderInfo: t.String(),
  }),
});
