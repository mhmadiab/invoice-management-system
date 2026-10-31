import { z } from "zod";
import { dateRangeShape, orderedDates, paginationSchema } from "./common";

export const reminderQuerySchema = paginationSchema.safeExtend({ status: z.enum(["scheduled", "sent", "failed", "cancelled"]).optional(), type: z.enum(["pre_due", "due_date", "overdue"]).optional() });
export const notificationQuerySchema = paginationSchema.safeExtend({
  ...dateRangeShape, type: z.enum(["invoice_issued", "invoice_overdue", "invoice_significantly_overdue", "payment_received", "contract_expiring_soon"]).optional(), status: z.enum(["pending", "sent", "failed"]).optional(),
}).refine(orderedDates, { message: "dateTo must be on or after dateFrom.", path: ["dateTo"] });
export type ReminderQuery = z.infer<typeof reminderQuerySchema>;
export type NotificationQuery = z.infer<typeof notificationQuerySchema>;
