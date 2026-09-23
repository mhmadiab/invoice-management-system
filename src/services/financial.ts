import { Prisma, type InvoiceStatus } from "@/app/generated/prisma/client";
import type { DiscountInput, InvoiceItemInput } from "@/types/invoices";
import { invalid } from "@/types/errors";
import { daysBetween } from "./dates";

const Decimal = Prisma.Decimal.clone({ precision: 40 });
export const decimal = (value: Prisma.Decimal | string | number) => new Decimal(value);
export const sum = (values: Prisma.Decimal[]) => values.reduce((total, value) => total.add(value), decimal(0));

function money(value: Prisma.Decimal, field: string) {
  const rounded = value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  if (!rounded.isFinite() || rounded.lt(0) || rounded.gt("9999999999.99")) invalid(field, "Calculated amount must be between 0 and 9999999999.99.");
  return rounded;
}

export function calculateInvoice(items: InvoiceItemInput[], discount: DiscountInput | null | undefined, rate: Prisma.Decimal) {
  const invoiceItems = items.map((item, index) => ({ ...item, lineTotal: money(decimal(item.quantity).mul(item.unitPrice), `items.${index}.lineTotal`) }));
  const subtotal = money(sum(invoiceItems.map(item => item.lineTotal)), "subtotal");
  if (discount?.type === "percentage" && discount.value.gt(100)) invalid("discount.value", "Percentage discount cannot exceed 100.");
  const rawDiscount = !discount ? decimal(0) : discount.type === "fixed" ? decimal(discount.value) : subtotal.mul(discount.value).div(100);
  if (rawDiscount.gt(subtotal)) invalid("discount.value", "Discount cannot exceed the subtotal.");
  const discountAmount = money(rawDiscount, "discount.value");
  const taxAmount = money(subtotal.sub(discountAmount).mul(rate).div(100), "taxRate");
  const totalAmount = money(subtotal.sub(discountAmount).add(taxAmount), "total");
  return { invoiceItems, subtotal, discountType: discount?.type ?? null, discountValue: discount?.value ?? null, discountAmount, taxRate: rate, taxAmount, totalAmount };
}

export type BalanceSource = { totalAmount: Prisma.Decimal; payments: { amount: Prisma.Decimal }[]; status: InvoiceStatus; dueDate: Date };
export function invoiceBalance(invoice: BalanceSource, now = new Date()) {
  const paidAmount = sum(invoice.payments.map(payment => payment.amount));
  const remainingBalance = decimal(invoice.totalAmount).sub(paidAmount);
  const overdueDays = daysBetween(invoice.dueDate, now);
  const isOverdue = overdueDays > 0 && remainingBalance.gt(0) && invoice.status !== "cancelled" && invoice.status !== "void";
  return { paidAmount, remainingBalance, isOverdue, daysOverdue: isOverdue ? overdueDays : 0 };
}
export function isOutstanding(invoice: BalanceSource) {
  return (invoice.status === "issued" || invoice.status === "partially_paid") && invoiceBalance(invoice).remainingBalance.gt(0);
}
