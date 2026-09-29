import type { IReportRepository } from "@/types/repositories";
import type { Database } from "./transaction";

export class PrismaReportRepository implements IReportRepository {
  constructor(private readonly resolveDatabase: () => Database) {}

  private get database(): Database { return this.resolveDatabase(); }

  invoices(businessId: bigint) { return this.database.invoice.findMany({ where: { businessId }, include: { payments: true, customer: true }, orderBy: { invoiceId: "desc" } }); }

  customers(businessId: bigint) { return this.database.customer.findMany({ where: { businessId }, orderBy: { customerId: "asc" } }); }

  payments(businessId: bigint, from?: Date, to?: Date) { return this.database.payment.findMany({ where: { invoice: { businessId }, paymentDate: { gte: from, lte: to } }, include: { invoice: { include: { customer: true } } }, orderBy: [{ paymentDate: "desc" }, { paymentId: "desc" }] }); }

  recentReminders(businessId: bigint) { return this.database.reminder.findMany({ where: { invoice: { businessId }, status: "sent", sentAt: { not: null } }, include: { invoice: true }, orderBy: [{ sentAt: "desc" }, { reminderId: "desc" }], take: 20 }); }
}
