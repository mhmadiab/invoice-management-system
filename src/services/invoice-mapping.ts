import type { InvoiceRecord } from "@/repository/invoices";
import { dateOnly } from "./dates";
import { invoiceBalance } from "./financial";

export function invoiceSummary(invoice: InvoiceRecord, now = new Date()) {
  return { id: invoice.invoiceId, customerId: invoice.customerId, invoiceNumber: invoice.invoiceNumber, issueDate: invoice.issueDate ? dateOnly(invoice.issueDate) : null, dueDate: dateOnly(invoice.dueDate), status: invoice.status, total: invoice.totalAmount, ...invoiceBalance(invoice, now) };
}
export function customerInvoiceSummary(invoice: InvoiceRecord, now = new Date()) {
  const balance = invoiceBalance(invoice, now);
  return { id: invoice.invoiceId, invoiceNumber: invoice.invoiceNumber, issueDate: invoice.issueDate ? dateOnly(invoice.issueDate) : null, dueDate: dateOnly(invoice.dueDate), status: invoice.status, total: invoice.totalAmount, remainingBalance: balance.remainingBalance, isOverdue: balance.isOverdue, daysOverdue: balance.daysOverdue };
}
export function invoiceDto(invoice: InvoiceRecord, now = new Date()) {
  return {
    ...invoiceSummary(invoice, now), contractId: invoice.contractId,
    items: invoice.invoiceItems.map(item => ({ id: item.invoiceItemId, description: item.description, quantity: item.quantity, unitPrice: item.unitPrice, lineTotal: item.lineTotal })),
    subtotal: invoice.subtotal, discountType: invoice.discountType, discountValue: invoice.discountValue, discountAmount: invoice.discountAmount,
    taxRate: invoice.taxRate, taxAmount: invoice.taxAmount, createdAt: invoice.createdAt, updatedAt: invoice.updatedAt,
  };
}
