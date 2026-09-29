import type { ISchedulerRepository, IUnitOfWork, ISchedulerLock } from "@/types/repositories";
import type { NotificationType } from "@/app/generated/prisma/client";
import type { IEmailSender } from "@/types/providers";
import { invoiceBalance, isOutstanding } from "./financial";
import { daysBetween, dateOnly } from "./dates";
import { ensureSettings } from "./system-settings";
import { reminderEnabled, reminderSchedule } from "./reminder-schedule";
import { renderTemplate, validateTemplate } from "./templates";

export type SchedulerPolicy = { significantlyOverdueDays: number; contractExpiringSoonDays: number };

export class SchedulerService {
  constructor(
    private readonly scheduler: ISchedulerRepository,
    private readonly unitOfWork: IUnitOfWork,
    private readonly lock: ISchedulerLock,
    private readonly email: IEmailSender,
  ) {}

  async processReminders(policy: SchedulerPolicy, now = new Date()) {
    if (!Number.isInteger(policy.significantlyOverdueDays) || policy.significantlyOverdueDays < 1 || !Number.isInteger(policy.contractExpiringSoonDays) || policy.contractExpiringSoonDays < 1) throw new Error("Configure positive integer notification thresholds.");
    return this.lock.run(async () => {
      const repository = this.scheduler;
      const counts = { remindersSent: 0, notificationsSent: 0, failed: 0 };
      for (const business of await repository.businesses()) {
        const settings = business.systemSettings ?? await this.unitOfWork.run(repositories => ensureSettings(business.businessId, repositories.settings));
        const queue = async (type: NotificationType, enabled: boolean, invoiceId?: bigint, contractId?: bigint) => {
          if (enabled && !await repository.notificationExists(business.administratorId, type, invoiceId, contractId)) {
            await repository.createNotification({ administratorId: business.administratorId, invoiceId, contractId, type, createdAt: now });
          }
        };
        for (const invoice of await repository.invoices(business.businessId)) {
          if (!isOutstanding(invoice)) continue;
          for (const scheduled of reminderSchedule(invoice, settings, now)) await repository.schedule(invoice.invoiceId, scheduled.type, scheduled.at);
          const balance = invoiceBalance(invoice, now);
          if (balance.isOverdue) await queue("invoice_overdue", settings.adminNotificationOverdueEnabled, invoice.invoiceId);
          if (balance.daysOverdue >= policy.significantlyOverdueDays) await queue("invoice_significantly_overdue", settings.adminNotificationSignificantlyOverdueEnabled, invoice.invoiceId);
        }
        for (const contract of await repository.contracts(business.businessId)) {
          const days = daysBetween(now, contract.endDate);
          if (days >= 0 && days <= policy.contractExpiringSoonDays) await queue("contract_expiring_soon", settings.adminNotificationContractExpiringSoonEnabled, undefined, contract.contractId);
        }
        for (const reminder of await repository.scheduled(business.businessId, now)) {
          if (!isOutstanding(reminder.invoice) || !reminderEnabled(reminder.reminderType, reminder.scheduledAt, reminder.invoice.dueDate, settings)) {
            await repository.finishReminder(reminder.reminderId, "cancelled", now);
            continue;
          }
          const template = business.emailTemplates.find(template => template.templateType === "customer_reminder") ?? { subject: "Payment reminder: {{invoiceNumber}}", body: "Hello {{customerName}}, the remaining balance on invoice {{invoiceNumber}} is {{remainingBalance}}." };
          const invoice = reminder.invoice;
          const values = { businessName: business.businessName, customerName: invoice.customer.name, customerEmail: invoice.customer.email, invoiceNumber: invoice.invoiceNumber ?? "", dueDate: dateOnly(invoice.dueDate), issueDate: invoice.issueDate ? dateOnly(invoice.issueDate) : "", total: invoice.totalAmount.toFixed(2), paidAmount: invoiceBalance(invoice, now).paidAmount.toFixed(2), remainingBalance: invoiceBalance(invoice, now).remainingBalance.toFixed(2) };
          try {
            validateTemplate(template);
            await this.email.send({ to: invoice.customer.email, subject: renderTemplate(template.subject, values).replace(/[\r\n]/g, " "), text: renderTemplate(template.body, values) });
          } catch {
            await repository.finishReminder(reminder.reminderId, "failed", now); counts.failed++; continue;
          }
          await repository.finishReminder(reminder.reminderId, "sent", now); counts.remindersSent++;
        }
        for (const notification of await repository.pendingNotifications(business.administratorId)) {
          const enabled = { invoice_issued: settings.adminNotificationInvoiceIssuedEnabled, payment_received: settings.adminNotificationPaymentReceivedEnabled, invoice_overdue: settings.adminNotificationOverdueEnabled, invoice_significantly_overdue: settings.adminNotificationSignificantlyOverdueEnabled, contract_expiring_soon: settings.adminNotificationContractExpiringSoonEnabled }[notification.type];
          if (!enabled) continue;
          if (notification.type === "contract_expiring_soon" && (!notification.contract || notification.contract.isArchived || notification.contract.status !== "active" || daysBetween(now, notification.contract.endDate) < 0 || daysBetween(now, notification.contract.endDate) > policy.contractExpiringSoonDays)) continue;
          if ((notification.type === "invoice_overdue" || notification.type === "invoice_significantly_overdue") && (!notification.invoice || !invoiceBalance(notification.invoice, now).isOverdue)) continue;
          const template = business.emailTemplates.find(template => template.templateType === "admin_notification") ?? { subject: "{{notificationType}}", body: "{{notificationType}}: {{invoiceNumber}}{{contractTitle}}" };
          const invoice = notification.invoice;
          const values = { notificationType: notification.type, businessName: business.businessName, customerName: invoice?.customer.name ?? notification.contract?.customer.name ?? "", invoiceNumber: invoice?.invoiceNumber ?? "", remainingBalance: invoice ? invoiceBalance(invoice, now).remainingBalance.toFixed(2) : "", paymentAmount: notification.payment?.amount.toFixed(2) ?? "", contractTitle: notification.contract?.title ?? "", expirationDate: notification.contract ? dateOnly(notification.contract.endDate) : "" };
          try {
            validateTemplate(template);
            await this.email.send({ to: business.administrator.email, subject: renderTemplate(template.subject, values).replace(/[\r\n]/g, " "), text: renderTemplate(template.body, values) });
          } catch {
            await repository.finishNotification(notification.notificationId, false, now); counts.failed++; continue;
          }
          await repository.finishNotification(notification.notificationId, true, now); counts.notificationsSent++;
        }
      }
      return counts;
    });
  }
}
