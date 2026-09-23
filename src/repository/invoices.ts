import { Prisma } from "@/app/generated/prisma/client";
import { getPrisma } from "@/prisma/client";
import type { Database } from "./transaction";

export const invoiceInclude = { invoiceItems: { orderBy: { invoiceItemId: "asc" } }, payments: { orderBy: [{ paymentDate: "desc" }, { paymentId: "desc" }] } } satisfies Prisma.InvoiceInclude;
export type InvoiceRecord = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>;

export function invoiceRepository(database: Database = getPrisma()) {
  return {
    get: (businessId: bigint, invoiceId: bigint) => database.invoice.findFirst({ where: { businessId, invoiceId }, include: invoiceInclude }),
    list: (businessId: bigint, filter: Omit<Prisma.InvoiceWhereInput, "businessId"> = {}) => database.invoice.findMany({ where: { ...filter, businessId }, include: invoiceInclude, orderBy: { invoiceId: "desc" } }),
    create: (data: Prisma.InvoiceUncheckedCreateInput) => database.invoice.create({ data, include: invoiceInclude }),
    update: (businessId: bigint, invoiceId: bigint, data: Prisma.InvoiceUpdateInput) => database.invoice.update({ where: { invoiceId, businessId }, data, include: invoiceInclude }),
    cancelReminders: (invoiceId: bigint) => database.reminder.updateMany({ where: { invoiceId, status: "scheduled" }, data: { status: "cancelled" } }),
    usedNumbers: (businessId: bigint) => database.invoice.findMany({ where: { businessId, invoiceNumber: { not: null } }, select: { invoiceNumber: true } }),
    forDocument: (businessId: bigint, invoiceId: bigint) => database.invoice.findFirst({ where: { businessId, invoiceId }, include: { ...invoiceInclude, business: true, customer: true } }),
  };
}
