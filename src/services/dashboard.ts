import type { IUnitOfWork } from "@/types/repositories";
import type { Actor } from "@/types/context";
import { dateOnly, daysBetween } from "./dates";
import { invoiceBalance, isOutstanding, sum } from "./financial";

type Activity = { type: "invoice_issued" | "payment_recorded" | "reminder_sent" | "customer_created"; description: string; occurredAt: Date; invoiceId?: bigint; customerId?: bigint };

export class DashboardService {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async dashboard(actor: Actor, now = new Date()) {
    return this.unitOfWork.run(async repositories => {
      const repository = repositories.reports;
      const [invoices, customers, payments, reminders] = await Promise.all([repository.invoices(actor.businessId), repository.customers(actor.businessId), repository.payments(actor.businessId), repository.recentReminders(actor.businessId)]);
      const month = dateOnly(now).slice(0, 7);
      const overdueInvoices = invoices.filter(invoice => invoiceBalance(invoice, now).isOverdue).map(invoice => ({
        invoiceId: invoice.invoiceId, invoiceNumber: invoice.invoiceNumber, customerId: invoice.customerId, customerName: invoice.customer.name, dueDate: dateOnly(invoice.dueDate), total: invoice.totalAmount,
        remainingBalance: invoiceBalance(invoice, now).remainingBalance, daysOverdue: invoiceBalance(invoice, now).daysOverdue,
      })).sort((a, b) => b.daysOverdue - a.daysOverdue);
      const dueSoon = invoices.filter(invoice => isOutstanding(invoice) && daysBetween(now, invoice.dueDate) >= 0 && daysBetween(now, invoice.dueDate) <= 7).map(invoice => ({
        invoiceId: invoice.invoiceId, invoiceNumber: invoice.invoiceNumber, customerId: invoice.customerId, customerName: invoice.customer.name, dueDate: dateOnly(invoice.dueDate), remainingBalance: invoiceBalance(invoice, now).remainingBalance, daysUntilDue: daysBetween(now, invoice.dueDate),
      })).sort((a, b) => a.daysUntilDue - b.daysUntilDue);
      const activity: Activity[] = [
        ...customers.map(customer => ({ type: "customer_created" as const, description: `Customer created: ${customer.name}`, occurredAt: customer.createdAt, customerId: customer.customerId })),
        ...invoices.filter(invoice => invoice.issueDate !== null).map(invoice => ({ type: "invoice_issued" as const, description: `Invoice issued: ${invoice.invoiceNumber}`, occurredAt: invoice.issueDate!, invoiceId: invoice.invoiceId, customerId: invoice.customerId })),
        ...payments.map(payment => ({ type: "payment_recorded" as const, description: `Payment recorded for ${payment.invoice.invoiceNumber}`, occurredAt: payment.createdAt, invoiceId: payment.invoiceId, customerId: payment.invoice.customerId })),
        ...reminders.map(reminder => ({ type: "reminder_sent" as const, description: `Reminder sent for ${reminder.invoice.invoiceNumber}`, occurredAt: reminder.sentAt!, invoiceId: reminder.invoiceId, customerId: reminder.invoice.customerId })),
      ];
      return { data: { activeCustomers: customers.filter(customer => customer.status === "active").length, outstandingAmount: sum(invoices.filter(isOutstanding).map(invoice => invoiceBalance(invoice, now).remainingBalance)), currentMonthCollected: sum(payments.filter(payment => dateOnly(payment.paymentDate).startsWith(month)).map(payment => payment.amount)), overdueInvoices, dueSoon, recentActivity: activity.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()).slice(0, 20) } };
    });
  }
}
