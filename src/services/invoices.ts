import { invoiceRepository } from "@/repository/invoices";
import { customerRepository } from "@/repository/customers";
import { contractRepository } from "@/repository/contracts";
import { settingsRepository } from "@/repository/settings";
import { notificationRepository } from "@/repository/notifications";
import { transaction } from "@/repository/transaction";
import type { Actor, Page } from "@/types/context";
import type { CreateInvoiceInput, InvoiceQuery, UpdateInvoiceInput } from "@/types/invoices";
import { ApplicationError, conflict, invalid, required } from "@/types/errors";
import { calculateInvoice, invoiceBalance } from "./financial";
import { asDate, today } from "./dates";
import { invoiceDto, invoiceSummary, customerInvoiceSummary } from "./invoice-mapping";
import { paginate } from "./pagination";
import { ensureSettings, formatInvoiceNumber } from "./system-settings";

export async function createInvoice(actor: Actor, input: CreateInvoiceInput) {
  return transaction(async database => {
    const customer = required(await customerRepository(database).get(actor.businessId, input.customerId), "customer");
    if (customer.status === "archived") invalid("customerId", "Select an active customer.");
    if (input.contractId != null) {
      const contract = required(await contractRepository(database).get(actor.businessId, input.contractId), "contract");
      if (contract.customerId !== input.customerId) conflict("CONTRACT_CUSTOMER_MISMATCH", "The selected contract does not belong to the selected customer.");
      if (contract.isArchived) invalid("contractId", "Select an unarchived contract.");
    }
    const settings = await ensureSettings(actor.businessId, database);
    const { invoiceItems, ...amounts } = calculateInvoice(input.items, input.discount, input.taxRate ?? settings.defaultTaxRate);
    const invoice = await invoiceRepository(database).create({ businessId: actor.businessId, customerId: input.customerId, contractId: input.contractId, dueDate: asDate(input.dueDate), ...amounts, invoiceItems: { create: invoiceItems } });
    return { data: invoiceDto(invoice) };
  });
}
export async function getInvoice(actor: Actor, id: bigint) {
  return { data: invoiceDto(required(await invoiceRepository().get(actor.businessId, id), "invoice")) };
}
export async function listInvoices(actor: Actor, query: InvoiceQuery, now = new Date()) {
  const invoices = await invoiceRepository().list(actor.businessId, {
    customerId: query.customerId, status: query.status,
    ...(query.invoiceNumber ? { invoiceNumber: { contains: query.invoiceNumber, mode: "insensitive" } } : {}),
    ...(query.issueDateFrom || query.issueDateTo ? { issueDate: { gte: query.issueDateFrom ? asDate(query.issueDateFrom) : undefined, lte: query.issueDateTo ? asDate(query.issueDateTo) : undefined } } : {}),
  });
  const rows = invoices.map(invoice => invoiceSummary(invoice, now)).filter(invoice => query.overdue === undefined || invoice.isOverdue === query.overdue);
  return paginate(rows, query);
}
export async function customerInvoices(actor: Actor, customerId: bigint, page: Page) {
  return transaction(async database => {
    required(await customerRepository(database).get(actor.businessId, customerId), "customer");
    const invoices = await invoiceRepository(database).list(actor.businessId, { customerId });
    return paginate(invoices.map(invoice => customerInvoiceSummary(invoice)), page);
  });
}
export async function updateInvoice(actor: Actor, id: bigint, input: UpdateInvoiceInput) {
  return transaction(async database => {
    const repository = invoiceRepository(database);
    const invoice = required(await repository.get(actor.businessId, id), "invoice");
    if (invoice.status !== "draft") throw new ApplicationError("unprocessable", "INVOICE_NOT_EDITABLE", "Only draft invoices can be modified.");
    const discount = input.discount === undefined ? (invoice.discountType && invoice.discountValue !== null ? { type: invoice.discountType, value: invoice.discountValue } : null) : input.discount;
    const { invoiceItems, ...amounts } = calculateInvoice(input.items ?? invoice.invoiceItems, discount, input.taxRate ?? invoice.taxRate);
    const result = await repository.update(actor.businessId, id, {
      ...amounts, dueDate: input.dueDate ? asDate(input.dueDate) : undefined,
      ...(input.items ? { invoiceItems: { deleteMany: {}, create: invoiceItems } } : {}),
    });
    return { data: invoiceDto(result) };
  });
}
export async function issueInvoice(actor: Actor, id: bigint, now = new Date()) {
  return transaction(async database => {
    const repository = invoiceRepository(database);
    const invoice = required(await repository.get(actor.businessId, id), "invoice");
    if (invoice.status !== "draft") conflict("INVOICE_NOT_DRAFT", "Only draft invoices can be issued.");
    if (!invoice.invoiceItems.length) conflict("INVOICE_NOT_DRAFT", "Invoice must contain at least one valid line item.");
    const currentSettings = await ensureSettings(actor.businessId, database);
    if (currentSettings.invoiceNumberNextValue >= 9223372036854775807n) conflict("INVOICE_SEQUENCE_EXHAUSTED", "The invoice number sequence is exhausted.");
    if (invoice.invoiceItems.some(item => !item.description.trim() || item.quantity.lte(0) || item.unitPrice.lt(0))) conflict("INVOICE_NOT_ISSUABLE", "Invoice must contain valid line items.");
    const discount = invoice.discountType && invoice.discountValue !== null ? { type: invoice.discountType, value: invoice.discountValue } : null;
    let finalized: ReturnType<typeof calculateInvoice>;
    try { finalized = calculateInvoice(invoice.invoiceItems, discount, invoice.taxRate); }
    catch (error) {
      if (error instanceof ApplicationError) conflict("INVOICE_NOT_ISSUABLE", "Invoice financial values are invalid.");
      throw error;
    }
    const settings = await settingsRepository(database).reserveNumber(actor.businessId);
    const invoiceNumber = formatInvoiceNumber(settings.invoiceNumberPrefix, settings.invoiceNumberNextValue - 1n);
    if ((await repository.usedNumbers(actor.businessId)).some(value => value.invoiceNumber === invoiceNumber)) conflict("INVOICE_SEQUENCE_CONFLICT", "The specified invoice sequence would reuse an existing invoice number.");
    const { invoiceItems, ...amounts } = finalized;
    const result = await repository.update(actor.businessId, id, {
      ...amounts, invoiceNumber, issueDate: today(now), status: "issued",
      invoiceItems: { update: invoiceItems.map((item, index) => ({ where: { invoiceItemId: invoice.invoiceItems[index].invoiceItemId }, data: { lineTotal: item.lineTotal } })) },
    });
    if (settings.adminNotificationInvoiceIssuedEnabled) await notificationRepository(database).create({ administratorId: actor.administratorId, invoiceId: id, type: "invoice_issued", createdAt: now });
    return { data: invoiceDto(result, now) };
  });
}
export async function cancelInvoice(actor: Actor, id: bigint) {
  return transaction(async database => {
    const repository = invoiceRepository(database);
    const invoice = required(await repository.get(actor.businessId, id), "invoice");
    if (invoice.status === "cancelled") conflict("INVOICE_ALREADY_CANCELLED", "Invoice is already cancelled.");
    if (invoice.status === "paid" || invoiceBalance(invoice).remainingBalance.lte(0)) conflict("PAID_INVOICE_CANNOT_BE_CANCELLED", "A fully paid invoice cannot be cancelled.");
    if (invoice.status !== "issued" && invoice.status !== "partially_paid") conflict("INVOICE_NOT_CANCELLABLE", "Only issued, unpaid invoices can be cancelled.");
    await repository.cancelReminders(id);
    return { data: invoiceDto(await repository.update(actor.businessId, id, { status: "cancelled" })) };
  });
}
export async function voidInvoice(actor: Actor, id: bigint) {
  return transaction(async database => {
    const repository = invoiceRepository(database);
    const invoice = required(await repository.get(actor.businessId, id), "invoice");
    if (invoice.status === "void") conflict("INVOICE_ALREADY_VOID", "Invoice is already void.");
    if (invoice.payments.length) conflict("INVOICE_WITH_PAYMENTS_CANNOT_BE_VOIDED", "An invoice with recorded payments cannot be voided.");
    if (invoice.status !== "draft" && invoice.status !== "issued") conflict("INVOICE_NOT_VOIDABLE", "Invoice cannot be voided in its current state.");
    await repository.cancelReminders(id);
    return { data: invoiceDto(await repository.update(actor.businessId, id, { status: "void" })) };
  });
}
