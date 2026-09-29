import type { IReportRepository, IUnitOfWork } from "@/types/repositories";
import type { Actor, Page } from "@/types/context";
import type { PaymentReportQuery } from "@/types/payments";
import { asDate, dateOnly } from "./dates";
import { decimal, invoiceBalance, isOutstanding, sum } from "./financial";
import { paginate, pagination } from "./pagination";

export class ReportService {
  constructor(
    private readonly reports: IReportRepository,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async financialSummary(actor: Actor, period: { dateFrom: string; dateTo: string }, now = new Date()) {
    return this.unitOfWork.run(async repositories => {
      const repository = repositories.reports;
      const [invoices, payments] = await Promise.all([repository.invoices(actor.businessId), repository.payments(actor.businessId, asDate(period.dateFrom), asDate(period.dateTo))]);
      const periodInvoices = invoices.filter(invoice => {
        const date = dateOnly(invoice.issueDate ?? invoice.createdAt);
        return date >= period.dateFrom && date <= period.dateTo;
      });
      const statusSummary = { draft: 0, issued: 0, partiallyPaid: 0, paid: 0, cancelled: 0, void: 0 };
      for (const invoice of periodInvoices) statusSummary[invoice.status === "partially_paid" ? "partiallyPaid" : invoice.status]++;
      const overdue = invoices.map(invoice => invoiceBalance(invoice, now)).filter(balance => balance.isOverdue);
      return { data: {
        period, totalInvoiced: sum(periodInvoices.filter(invoice => ["issued", "partially_paid", "paid"].includes(invoice.status)).map(invoice => invoice.totalAmount)),
        totalCollected: sum(payments.map(payment => payment.amount)), outstandingAmount: sum(invoices.filter(isOutstanding).map(invoice => invoiceBalance(invoice, now).remainingBalance)),
        overdueCount: overdue.length, overdueAmount: sum(overdue.map(balance => balance.remainingBalance)), invoiceStatusSummary: statusSummary,
      } };
    });
  }

  async customerBalances(actor: Actor, page: Page) {
    return this.unitOfWork.run(async repositories => {
      const repository = repositories.reports;
      const [customers, invoices] = await Promise.all([repository.customers(actor.businessId), repository.invoices(actor.businessId)]);
      const balances = new Map(customers.map(customer => [customer.customerId, { customerId: customer.customerId, customerName: customer.name, outstandingAmount: decimal(0), unpaidInvoiceCount: 0 }]));
      for (const invoice of invoices.filter(isOutstanding)) {
        const balance = balances.get(invoice.customerId);
        if (balance) { balance.outstandingAmount = balance.outstandingAmount.add(invoiceBalance(invoice).remainingBalance); balance.unpaidInvoiceCount++; }
      }
      const rows = [...balances.values()].sort((a, b) => b.outstandingAmount.cmp(a.outstandingAmount) || (a.customerId < b.customerId ? -1 : 1));
      return paginate(rows, page);
    });
  }

  async paymentReport(actor: Actor, query: PaymentReportQuery) {
    const payments = await this.reports.payments(actor.businessId, asDate(query.dateFrom), asDate(query.dateTo));
    const rows = payments.slice((query.page - 1) * query.pageSize, query.page * query.pageSize).map(payment => {
      if (payment.invoice.invoiceNumber === null) throw new Error("A payment must reference an issued invoice.");
      return { id: payment.paymentId, invoiceId: payment.invoiceId, invoiceNumber: payment.invoice.invoiceNumber, customerId: payment.invoice.customerId, customerName: payment.invoice.customer.name, amount: payment.amount, paymentDate: dateOnly(payment.paymentDate), method: payment.paymentMethod };
    });
    return { data: { period: { dateFrom: query.dateFrom, dateTo: query.dateTo }, totalCollected: sum(payments.map(payment => payment.amount)), payments: rows }, pagination: pagination(query, payments.length) };
  }
}
