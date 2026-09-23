import type { Payment } from "@/app/generated/prisma/client";
import { invoiceRepository } from "@/repository/invoices";
import { paymentRepository } from "@/repository/payments";
import { notificationRepository } from "@/repository/notifications";
import { transaction } from "@/repository/transaction";
import type { Actor, Page } from "@/types/context";
import type { CreatePaymentInput, PaymentQuery } from "@/types/payments";
import { conflict, required } from "@/types/errors";
import { asDate, dateOnly } from "./dates";
import { invoiceBalance } from "./financial";
import { ensureSettings } from "./system-settings";
import { paginate } from "./pagination";
import type { InvoiceRecord } from "@/repository/invoices";

export function paymentDto(payment: Payment) {
  return { id: payment.paymentId, invoiceId: payment.invoiceId, amount: payment.amount, paymentDate: dateOnly(payment.paymentDate), method: payment.paymentMethod, createdAt: payment.createdAt };
}
export function paymentSummary(invoice: InvoiceRecord) {
  const { paidAmount, remainingBalance } = invoiceBalance(invoice);
  return { total: invoice.totalAmount, paidAmount, remainingBalance, status: invoice.status };
}
export async function createPayment(actor: Actor, invoiceId: bigint, input: CreatePaymentInput, now = new Date()) {
  return transaction(async database => {
    const invoices = invoiceRepository(database);
    const invoice = required(await invoices.get(actor.businessId, invoiceId), "invoice");
    if (invoice.status === "paid") conflict("INVOICE_ALREADY_PAID", "Payment cannot be recorded because the invoice is already fully paid.");
    if (invoice.status !== "issued" && invoice.status !== "partially_paid") conflict("INVOICE_NOT_PAYABLE", "Payment cannot be recorded against this invoice.");
    const { remainingBalance } = invoiceBalance(invoice, now);
    if (input.amount.gt(remainingBalance)) conflict("PAYMENT_EXCEEDS_REMAINING_BALANCE", "Payment amount cannot exceed the invoice remaining balance.");
    const payment = await paymentRepository(database).create({ invoiceId, amount: input.amount, paymentDate: asDate(input.paymentDate), paymentMethod: input.method, createdAt: now });
    const fullyPaid = remainingBalance.eq(input.amount);
    const result = await invoices.update(actor.businessId, invoiceId, { status: fullyPaid ? "paid" : "partially_paid" });
    if (fullyPaid) await invoices.cancelReminders(invoiceId);
    const settings = await ensureSettings(actor.businessId, database);
    if (settings.adminNotificationPaymentReceivedEnabled) await notificationRepository(database).create({ administratorId: actor.administratorId, invoiceId, paymentId: payment.paymentId, type: "payment_received", createdAt: now });
    return { data: paymentDto(payment), invoice: paymentSummary(result) };
  });
}
export async function invoicePayments(actor: Actor, invoiceId: bigint, page: Page) {
  const invoice = required(await invoiceRepository().get(actor.businessId, invoiceId), "invoice");
  return { ...paginate(invoice.payments.map(paymentDto), page), invoice: paymentSummary(invoice) };
}
export async function listPayments(actor: Actor, query: PaymentQuery) {
  const rows = await paymentRepository().list(actor.businessId, {
    paymentMethod: query.method,
    ...(query.dateFrom || query.dateTo ? { paymentDate: { gte: query.dateFrom ? asDate(query.dateFrom) : undefined, lte: query.dateTo ? asDate(query.dateTo) : undefined } } : {}),
  }, query.customerId);
  return paginate(rows.map(paymentDto), query);
}
