import { z } from "zod";
import { emailSchema, idSchema, integerSchema, nameSchema, taxSchema } from "./common";

export const businessSettingsSchema = z.strictObject({
  businessName: nameSchema, email: emailSchema, address: z.string().max(500).nullable().optional(), phone: z.string().max(50).nullable().optional(),
  taxIdentifier: z.string().max(100).nullable().optional(), logoUrl: z.string().max(500).nullable().optional(),
});
export const invoiceSettingsSchema = z.strictObject({
  invoicePrefix: z.string().max(50).nullable(), nextInvoiceNumber: idSchema.refine(value => value >= 1n, "Must be at least 1."),
  defaultTaxRate: taxSchema.refine(value => value.lte(100), "Must be at most 100."),
});
const reminderDay = integerSchema.pipe(z.number().min(1).max(365));
export const reminderSettingsSchema = z.strictObject({
  preDueEnabled: z.boolean(), preDueDays: reminderDay.nullable(), dueDateEnabled: z.boolean(), overdueEnabled: z.boolean(),
  overdueDays: z.array(reminderDay).refine(value => new Set(value).size === value.length, "Days must be unique."),
});
export const notificationSettingsSchema = z.strictObject({
  overdueInvoiceEnabled: z.boolean(), significantlyOverdueInvoiceEnabled: z.boolean(), paymentReceivedEnabled: z.boolean(), invoiceIssuedEnabled: z.boolean(), contractExpiringSoonEnabled: z.boolean(),
});
export const templateTypeSchema = z.enum(["invoice_delivery", "customer_reminder", "admin_notification"]);
export const templateParamsSchema = z.object({ templateType: templateTypeSchema });
export const emailTemplateSchema = z.strictObject({ subject: z.string().min(1).max(255), body: z.string().min(1) });
export type BusinessSettingsInput = z.infer<typeof businessSettingsSchema>;
export type InvoiceSettingsInput = z.infer<typeof invoiceSettingsSchema>;
export type ReminderSettingsInput = z.infer<typeof reminderSettingsSchema>;
export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;
export type EmailTemplateInput = z.infer<typeof emailTemplateSchema>;
