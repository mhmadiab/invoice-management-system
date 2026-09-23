import { getPrisma } from "@/prisma/client";
import type { Database } from "./transaction";

export function reportRepository(database: Database = getPrisma()) {
  return {
    invoices: (businessId: bigint) => database.invoice.findMany({ where: { businessId }, include: { payments: true, customer: true }, orderBy: { invoiceId: "desc" } }),
    customers: (businessId: bigint) => database.customer.findMany({ where: { businessId }, orderBy: { customerId: "asc" } }),
    payments: (businessId: bigint, from?: Date, to?: Date) => database.payment.findMany({ where: { invoice: { businessId }, paymentDate: { gte: from, lte: to } }, include: { invoice: { include: { customer: true } } }, orderBy: [{ paymentDate: "desc" }, { paymentId: "desc" }] }),
    recentReminders: (businessId: bigint) => database.reminder.findMany({ where: { invoice: { businessId }, status: "sent", sentAt: { not: null } }, include: { invoice: true }, orderBy: [{ sentAt: "desc" }, { reminderId: "desc" }], take: 20 }),
  };
}
