import type { IInvoiceRepository } from "@/types/repositories";
import { Prisma } from "@/app/generated/prisma/client";
import type { Database } from "./transaction";

/**
 * the repository retrieves an invoice, its invoice items and payments.
 */
export const invoiceInclude = { 
  invoiceItems: { orderBy: { invoiceItemId: "asc" } }, 
  payments: { orderBy: [{ paymentDate: "desc" }, { paymentId: "desc" }] } 
} satisfies Prisma.InvoiceInclude;

export type { InvoiceRecord } from "@/types/repositories";

export class PrismaInvoiceRepository implements IInvoiceRepository {
  constructor(private readonly resolveDatabase: () => Database) {}

  private get database(): Database { return this.resolveDatabase(); }

  //It gives the service an InvoiceRecord containing the related items and payments.
  get(businessId: bigint, invoiceId: bigint) { return this.database.invoice.findFirst({ where: { businessId, invoiceId }, include: invoiceInclude }); }

  //Get all invoices for this business matching the supplied filters, including their items and payments.
  list(businessId: bigint, filter: Omit<Prisma.InvoiceWhereInput, "businessId"> = {}) { return this.database.invoice.findMany({ where: { ...filter, businessId }, include: invoiceInclude, orderBy: { invoiceId: "desc" } }); }

  //This creates the invoice and returns the invoice with: invoiceItems and payments
  create(data: Prisma.InvoiceUncheckedCreateInput) { return this.database.invoice.create({ data, include: invoiceInclude }); }

  //update only the invoice of this business and return the invoice with invoiceItems and payments 
  update(businessId: bigint, invoiceId: bigint, data: Prisma.InvoiceUpdateInput) { return this.database.invoice.update({ where: { invoiceId, businessId }, data, include: invoiceInclude }); }

  /**
   * Find reminders for this invoice
      Only scheduled reminders
      Change them to cancelled
   */
  cancelReminders(invoiceId: bigint) { return this.database.reminder.updateMany({ where: { invoiceId, status: "scheduled" }, data: { status: "cancelled" } }); }

  //this is used for invoice issuing and number management it only returns the invoice number 
  usedNumbers(businessId: bigint) { return this.database.invoice.findMany({ where: { businessId, invoiceNumber: { not: null } }, select: { invoiceNumber: true } }); }

  //for generating an invoice document/PDF where you need the business and customer information
  forDocument(businessId: bigint, invoiceId: bigint) { return this.database.invoice.findFirst({ where: { businessId, invoiceId }, include: { ...invoiceInclude, business: true, customer: true } }); }
}
