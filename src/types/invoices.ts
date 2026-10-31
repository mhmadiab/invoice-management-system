import { z } from "zod";
import { dateSchema, idSchema, moneySchema, nonempty, paginationSchema, pathIdSchema, positiveMoneySchema, queryBooleanSchema, taxSchema } from "./common";

export const invoiceStatusSchema = z.enum(["draft", "issued", "partially_paid", "paid", "cancelled", "void"]);
export const invoiceItemSchema = z.strictObject({ description: z.string().min(1).max(500), quantity: positiveMoneySchema, unitPrice: moneySchema });
export const discountSchema = z.strictObject({ type: z.enum(["percentage", "fixed"]), value: moneySchema });
export const createInvoiceSchema = z.strictObject({
  customerId: idSchema, contractId: idSchema.nullable().optional(), dueDate: dateSchema,
  items: z.array(invoiceItemSchema).min(1), discount: discountSchema.nullable().optional(), taxRate: taxSchema.optional(),
});
export const updateInvoiceSchema = z.strictObject({ dueDate: dateSchema.optional(), items: z.array(invoiceItemSchema).min(1).optional(), discount: discountSchema.nullable().optional(), taxRate: taxSchema.optional() }).refine(nonempty, "Supply at least one field.");
export const invoiceQuerySchema = paginationSchema.safeExtend({
  invoiceNumber: z.string().min(1).max(100).optional(), customerId: pathIdSchema.optional(), status: invoiceStatusSchema.optional(),
  issueDateFrom: dateSchema.optional(), issueDateTo: dateSchema.optional(), overdue: queryBooleanSchema.optional(),
}).refine(value => !value.issueDateFrom || !value.issueDateTo || value.issueDateFrom <= value.issueDateTo, { path: ["issueDateTo"], message: "issueDateTo must be on or after issueDateFrom." });
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
export type DiscountInput = z.infer<typeof discountSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type InvoiceQuery = z.infer<typeof invoiceQuerySchema>;
