import type { IInvoiceRepository, IPaymentRepository, IUnitOfWork } from "@/types/repositories";
import type { IPaymentService } from "@/types/services";
import type { Payment } from "@/app/generated/prisma/client";
import type { Actor, Page } from "@/types/context";
import type { CreatePaymentInput, PaymentQuery } from "@/types/payments";
import { conflict, required } from "@/types/errors";
import { asDate, dateOnly } from "./dates";
import { invoiceBalance } from "./financial";
import { ensureSettings } from "./system-settings";
import { paginate } from "./pagination";
import type { InvoiceRecord } from "@/repository/invoices";

/** definition for the payment API format */
export function paymentDto(payment: Payment) {
  return { id: payment.paymentId, invoiceId: payment.invoiceId, amount: payment.amount, paymentDate: dateOnly(payment.paymentDate), method: payment.paymentMethod, createdAt: payment.createdAt };
}
/** definition of payment Summary API format to be included in Invoice */
export function paymentSummary(invoice: InvoiceRecord) {
  const { paidAmount, remainingBalance } = invoiceBalance(invoice);
  return { total: invoice.totalAmount, paidAmount, remainingBalance, status: invoice.status };
}

export class PaymentService implements IPaymentService {
  constructor(
    private readonly invoices: IInvoiceRepository,
    private readonly payments: IPaymentRepository,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async createPayment(actor: Actor, invoiceId: bigint, input: CreatePaymentInput, now = new Date()) {
    return this.unitOfWork.run(async repositories => {
      //define the invoice repo
      const invoices = repositories.invoices;
      //retrieve the invoice for the related business
      const invoice = required(await invoices.get(actor.businessId, invoiceId), "invoice");
      /** 
       * A paid invoice cannot receive another payment.
       * draft, paid, cancelled and void cannot receive another payment.
       */
      if (invoice.status === "paid") conflict("INVOICE_ALREADY_PAID", "Payment cannot be recorded because the invoice is already fully paid.");
      if (invoice.status !== "issued" && invoice.status !== "partially_paid") conflict("INVOICE_NOT_PAYABLE", "Payment cannot be recorded against this invoice.");
      //financial calculation
      const { remainingBalance } = invoiceBalance(invoice, now);
      //prevents overpayment 
      if (input.amount.gt(remainingBalance)) conflict("PAYMENT_EXCEEDS_REMAINING_BALANCE", "Payment amount cannot exceed the invoice remaining balance.");
      //create payment with providing dynamic invoiceId(from URL), createdAt, paymentid
      const payment = await repositories.payments.create({ invoiceId, amount: input.amount, paymentDate: asDate(input.paymentDate), paymentMethod: input.method, createdAt: now });
      /**
       * updating the invoice status
       * Payment < remaining ==> partially_paid or Payment = remaining ==> paid  
      */
      const fullyPaid = remainingBalance.eq(input.amount);
      const result = await invoices.update(actor.businessId, invoiceId, { status: fullyPaid ? "paid" : "partially_paid" });
      //reminders should stop once the invoice is fully paid.
      if (fullyPaid) await invoices.cancelReminders(invoiceId);
      //get admin settings and notification sent 
      const settings = await ensureSettings(actor.businessId, repositories.settings);
      if (settings.adminNotificationPaymentReceivedEnabled) await repositories.notifications.create({ administratorId: actor.administratorId, invoiceId, paymentId: payment.paymentId, type: "payment_received", createdAt: now });
      return { data: paymentDto(payment), invoice: paymentSummary(result) };
    });
  }

  async invoicePayments(actor: Actor, invoiceId: bigint, page: Page) {
    //getting the invoice related to the actor
    const invoice = required(await this.invoices.get(actor.businessId, invoiceId), "invoice");
    /**
     * 1. returning the invoice together with its related payments.
     * 2. Convert database payments to API DTOs
     * 3. Paginate the payments
     * 4. Add invoice financial summary
     */
    return { ...paginate(invoice.payments.map(paymentDto), page), invoice: paymentSummary(invoice) };
  }

  async listPayments(actor: Actor, query: PaymentQuery) {
    //build payment filters (date, customer, )
    const rows = await this.payments.list(actor.businessId, {
      paymentMethod: query.method,
      ...(query.dateFrom || query.dateTo ? { paymentDate: { gte: query.dateFrom ? asDate(query.dateFrom) : undefined, lte: query.dateTo ? asDate(query.dateTo) : undefined } } : {}),
    }, query.customerId);
    return paginate(rows.map(paymentDto), query);
  }
}
