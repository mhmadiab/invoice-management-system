import { z } from "zod";
import { dateSchema, dateRangeShape, orderedDates, paginationSchema, pathIdSchema, positiveMoneySchema } from "./common";

export const paymentMethodSchema = z.enum(["cash", "bank_transfer", "card", "cheque"]);
export const createPaymentSchema = z.strictObject({ amount: positiveMoneySchema, paymentDate: dateSchema, method: paymentMethodSchema });
export const paymentQuerySchema = paginationSchema.safeExtend({ ...dateRangeShape, customerId: pathIdSchema.optional(), method: paymentMethodSchema.optional() }).refine(orderedDates, { message: "dateTo must be on or after dateFrom.", path: ["dateTo"] });
export const paymentReportQuerySchema = paginationSchema.safeExtend({ dateFrom: dateSchema, dateTo: dateSchema }).refine(orderedDates, { message: "dateTo must be on or after dateFrom.", path: ["dateTo"] });
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type PaymentQuery = z.infer<typeof paymentQuerySchema>;
export type PaymentReportQuery = z.infer<typeof paymentReportQuerySchema>;
