import type { IInvoiceRepository } from "@/types/repositories";
import { Prisma } from "@/app/generated/prisma/client";
import type { Database } from "./transaction";

export const invoiceInclude = { invoiceItems: { orderBy: { invoiceItemId: "asc" } }, payments: { orderBy: [{ paymentDate: "desc" }, { paymentId: "desc" }] } } satisfies Prisma.InvoiceInclude;
export type { InvoiceRecord } from "@/types/repositories";

export class PrismaInvoiceRepository implements IInvoiceRepository {
  constructor(private readonly resolveDatabase: () => Database) {}

  private get database(): Database { return this.resolveDatabase(); }

  get(businessId: bigint, invoiceId: bigint) { return this.database.invoice.findFirst({ where: { businessId, invoiceId }, include: invoiceInclude }); }

  list(businessId: bigint, filter: Omit<Prisma.InvoiceWhereInput, "businessId"> = {}) { return this.database.invoice.findMany({ where: { ...filter, businessId }, include: invoiceInclude, orderBy: { invoiceId: "desc" } }); }

  create(data: Prisma.InvoiceUncheckedCreateInput) { return this.database.invoice.create({ data, include: invoiceInclude }); }

  update(businessId: bigint, invoiceId: bigint, data: Prisma.InvoiceUpdateInput) { return this.database.invoice.update({ where: { invoiceId, businessId }, data, include: invoiceInclude }); }

  cancelReminders(invoiceId: bigint) { return this.database.reminder.updateMany({ where: { invoiceId, status: "scheduled" }, data: { status: "cancelled" } }); }

  usedNumbers(businessId: bigint) { return this.database.invoice.findMany({ where: { businessId, invoiceNumber: { not: null } }, select: { invoiceNumber: true } }); }

  forDocument(businessId: bigint, invoiceId: bigint) { return this.database.invoice.findFirst({ where: { businessId, invoiceId }, include: { ...invoiceInclude, business: true, customer: true } }); }
}
