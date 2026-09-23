import { z } from "zod";
import { LosslessNumber } from "lossless-json";
import { Prisma } from "@/app/generated/prisma/client";

const numeric = z.union([z.number(), z.instanceof(LosslessNumber)]);
export const decimalSchema = numeric.transform(value => new Prisma.Decimal(value.toString()))
  .refine(value => value.isFinite() && value.gte(0), "Must be a finite, non-negative number.");
export const positiveDecimalSchema = decimalSchema.refine(value => value.gt(0), "Must be greater than zero.");
export const moneySchema = decimalSchema.refine(value => value.decimalPlaces() <= 2 && value.lte("9999999999.99"), "Must have at most two decimal places and be at most 9999999999.99.");
export const positiveMoneySchema = moneySchema.refine(value => value.gt(0), "Must be greater than zero.");
export const taxSchema = decimalSchema.refine(value => value.decimalPlaces() <= 2 && value.lte("999.99"), "Must have at most two decimal places and be at most 999.99.");
export const integerSchema = numeric.transform(value => Number(value.toString()))
  .pipe(z.number().int().safe());
export const idSchema = numeric.transform(value => new Prisma.Decimal(value.toString()))
  .refine(value => value.isInteger() && value.gte("-9223372036854775808") && value.lte("9223372036854775807"), "Must be a signed 64-bit integer.")
  .transform(value => BigInt(value.toFixed(0)));
export const pathIdSchema = z.string().regex(/^-?\d+$/, "Must be an integer.")
  .transform((value): number | LosslessNumber => new LosslessNumber(BigInt(value).toString())).pipe(idSchema);
export const dateSchema = z.iso.date();
export const emailSchema = z.email().max(254);
export const nameSchema = z.string().min(1).max(200).refine(value => value.trim().length > 0, "Cannot be blank.");
export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(2147483647)).default(1),
  pageSize: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).default(20),
}).refine(value => (value.page - 1) * value.pageSize <= 2147483647, { message: "Page is too large.", path: ["page"] });
export const queryBooleanSchema = z.enum(["true", "false"]).transform(value => value === "true");
export const dateRangeShape = { dateFrom: dateSchema.optional(), dateTo: dateSchema.optional() };
export const orderedDates = (value: { dateFrom?: string; dateTo?: string }) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo;
export const dateRangeSchema = z.object(dateRangeShape).refine(orderedDates, { message: "dateTo must be on or after dateFrom.", path: ["dateTo"] });
export const reportPeriodSchema = z.object({ dateFrom: dateSchema, dateTo: dateSchema })
  .refine(orderedDates, { message: "dateTo must be on or after dateFrom.", path: ["dateTo"] });
export const nonempty = (value: object) => Object.keys(value).length > 0;
export const emptyQuerySchema = z.object({});
export const emptyParamsSchema = z.object({});
export const customerParamsSchema = z.object({ customerId: pathIdSchema });
export const contractParamsSchema = z.object({ contractId: pathIdSchema });
export const invoiceParamsSchema = z.object({ invoiceId: pathIdSchema });
export const notificationParamsSchema = z.object({ notificationId: pathIdSchema });
