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
      //we are excuting database invoices and payments concurently
      const [invoices, payments] = await Promise.all([repository.invoices(actor.businessId), repository.payments(actor.businessId, asDate(period.dateFrom), asDate(period.dateTo))]);
      /** 
       * contains the business's invoices and their payments. 
       * contains payments whose paymentDate falls within the supplied date range.
      */
     //returned filtered invoices
      const periodInvoices = invoices.filter(invoice => {
        const date = dateOnly(invoice.issueDate ?? invoice.createdAt);
        return date >= period.dateFrom && date <= period.dateTo;
      });
      /** initialize Summary */
      const statusSummary = { draft: 0, issued: 0, partiallyPaid: 0, paid: 0, cancelled: 0, void: 0 };
      //mapping each invoice status 
      for (const invoice of periodInvoices) statusSummary[invoice.status === "partially_paid" ? "partiallyPaid" : invoice.status]++;
      //calculate overdue invoices
      const overdue = invoices.map(invoice => invoiceBalance(invoice, now)).filter(balance => balance.isOverdue);
      /**
       * totalInvoiced	Sum of totals for period invoices currently in issued, partially_paid, or paid status
       * totalCollected	Sum of payments retrieved for the selected payment-date range
       * outstandingAmount	Sum of remaining balances for all invoices considered outstanding
       * overdueCount	Number of invoices currently overdue
       * overdueAmount	Sum of the remaining balances of overdue invoices
       * invoiceStatusSummary	Counts of period invoices by current status
       */
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
      /** retreive customers and invoices */
      const [customers, invoices] = await Promise.all([repository.customers(actor.businessId), repository.invoices(actor.businessId)]);
      /** create initial balance entry for each customer */
      const balances = new Map(customers.map(customer => [customer.customerId, { customerId: customer.customerId, customerName: customer.name, outstandingAmount: decimal(0), unpaidInvoiceCount: 0 }]));
      /**Add outstanding invoices to their customers */
      for (const invoice of invoices.filter(isOutstanding)) {
        const balance = balances.get(invoice.customerId);
        if (balance) { balance.outstandingAmount = balance.outstandingAmount.add(invoiceBalance(invoice).remainingBalance); balance.unpaidInvoiceCount++; }
      }
      /** sorting, paginating and return data */
      const rows = [...balances.values()].sort((a, b) => b.outstandingAmount.cmp(a.outstandingAmount) || (a.customerId < b.customerId ? -1 : 1));
      return paginate(rows, page);
    });
  }

  async paymentReport(actor: Actor, query: PaymentReportQuery) {
    /** The repository filters by payment date and business. Each payment includes its invoice and the invoice's customer. */
    const payments = await this.reports.payments(actor.businessId, asDate(query.dateFrom), asDate(query.dateTo));
    /** slices the retrieved array in memory, then converts each payment into a response row containing:
        - Payment ID
        - Invoice ID and invoice number
        - Customer ID and customer name
        - Amount
        - Payment date
        - Payment method  
    */
    const rows = payments.slice((query.page - 1) * query.pageSize, query.page * query.pageSize).map(payment => {
      if (payment.invoice.invoiceNumber === null) throw new Error("A payment must reference an issued invoice.");
      return { id: payment.paymentId, invoiceId: payment.invoiceId, invoiceNumber: payment.invoice.invoiceNumber, customerId: payment.invoice.customerId, customerName: payment.invoice.customer.name, amount: payment.amount, paymentDate: dateOnly(payment.paymentDate), method: payment.paymentMethod };
    });
    return { data: { period: { dateFrom: query.dateFrom, dateTo: query.dateTo }, totalCollected: sum(payments.map(payment => payment.amount)), payments: rows }, pagination: pagination(query, payments.length) };
  }
}
