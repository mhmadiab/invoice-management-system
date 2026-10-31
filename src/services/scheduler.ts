import type { ISchedulerRepository, IUnitOfWork, ISchedulerLock } from "@/types/repositories";
import type { NotificationType } from "@/app/generated/prisma/client";
import type { IEmailSender } from "@/types/providers";
import { invoiceBalance, isOutstanding } from "./financial";
import { daysBetween, dateOnly } from "./dates";
import { ensureSettings } from "./system-settings";
import { reminderEnabled, reminderSchedule } from "./reminder-schedule";
import { renderTemplate, validateTemplate } from "./templates";

/**contains notifications threshold  */
export type SchedulerPolicy = { significantlyOverdueDays: number; contractExpiringSoonDays: number };
/**
 * this Scheduler component responsible for automatically checking business conditions and carrying out scheduled background work:
 * sending customer payment reminders
 * generating administrator notifications
 * notifying administrators about contracts that are approaching expiration
 */
export class SchedulerService {
  constructor(
    private readonly scheduler: ISchedulerRepository,
    private readonly unitOfWork: IUnitOfWork,
    private readonly lock: ISchedulerLock,
    private readonly email: IEmailSender,
  ) {}

  async processReminders(policy: SchedulerPolicy, now = new Date()) {
    if (!Number.isInteger(policy.significantlyOverdueDays) || policy.significantlyOverdueDays < 1 || !Number.isInteger(policy.contractExpiringSoonDays) || policy.contractExpiringSoonDays < 1) throw new Error("Configure positive integer notification thresholds.");
    /** advisory lock is intended to prevent two competetive worker to process a resource  */
    return this.lock.run(async () => {
      const repository = this.scheduler;
      /**After the lock is acquired, the service initializes its counters:  */
      const counts = { remindersSent: 0, notificationsSent: 0, failed: 0 };

      /**
       * This is important for a multi-business application: one scheduler run can process many businesses, 
       * while using each business's own settings, customers, invoices, and templates.
       */
      for (const business of await repository.businesses()) {
        /**load or initialize settings */
        const settings = business.systemSettings ?? await this.unitOfWork.run(repositories => ensureSettings(business.businessId, repositories.settings));
        /**
         * QUEUE: It creates a notification record only when:
            1. The relevant setting is enabled.
            2. A matching notification does not already exist.
         */
        const queue = async (type: NotificationType, enabled: boolean, invoiceId?: bigint, contractId?: bigint) => {
          if (enabled && !await repository.notificationExists(business.administratorId, type, invoiceId, contractId)) {
            await repository.createNotification({ administratorId: business.administratorId, invoiceId, contractId, type, createdAt: now });
          }
        };
        /**Schedule reminders and queue overdue notifications */
        for (const invoice of await repository.invoices(business.businessId)) {
          /** Ignore invoices that are not outstanding */
          if (!isOutstanding(invoice)) continue;
          /**Generate reminder schedules */
          for (const scheduled of reminderSchedule(invoice, settings, now)) await repository.schedule(invoice.invoiceId, scheduled.type, scheduled.at);
          /** Detect overdue invoices and queue notifications */
          const balance = invoiceBalance(invoice, now);
          if (balance.isOverdue) await queue("invoice_overdue", settings.adminNotificationOverdueEnabled, invoice.invoiceId);
          if (balance.daysOverdue >= policy.significantlyOverdueDays) await queue("invoice_significantly_overdue", settings.adminNotificationSignificantlyOverdueEnabled, invoice.invoiceId);
        }
        /** 
         * Inspect active contracts
         * Queue expiration notifications 
         * */
        for (const contract of await repository.contracts(business.businessId)) {
          const days = daysBetween(now, contract.endDate);
          /** 
           * The notification is queued only if the corresponding administrator notification setting is enabled 
           * and a matching notification does not already exist.
           */
          if (days >= 0 && days <= policy.contractExpiringSoonDays) await queue("contract_expiring_soon", settings.adminNotificationContractExpiringSoonEnabled, undefined, contract.contractId);
        }
        /** 
         * Process due customer reminders
         * Send email and update reminder status 
         * */
        for (const reminder of await repository.scheduled(business.businessId, now)) {
          /** eligibility is checked both when scheduling work and immediately before performing it. */
          if (!isOutstanding(reminder.invoice) || !reminderEnabled(reminder.reminderType, reminder.scheduledAt, reminder.invoice.dueDate, settings)) {
            await repository.finishReminder(reminder.reminderId, "cancelled", now);
            continue;
          }
          /** looks for the business's saved customer_reminder email template, if not, uses the hard-coded fallback. */
          const template = business.emailTemplates.find(template => template.templateType === "customer_reminder") ?? { subject: "Payment reminder: {{invoiceNumber}}", body: "Hello {{customerName}}, the remaining balance on invoice {{invoiceNumber}} is {{remainingBalance}}." };
          const invoice = reminder.invoice;
          /** These values provide the information that can be inserted into placeholders in the template. */
          const values = { businessName: business.businessName, customerName: invoice.customer.name, customerEmail: invoice.customer.email, invoiceNumber: invoice.invoiceNumber ?? "", dueDate: dateOnly(invoice.dueDate), issueDate: invoice.issueDate ? dateOnly(invoice.issueDate) : "", total: invoice.totalAmount.toFixed(2), paidAmount: invoiceBalance(invoice, now).paidAmount.toFixed(2), remainingBalance: invoiceBalance(invoice, now).remainingBalance.toFixed(2) };
          try {
            /** validate and send */
            validateTemplate(template);
            await this.email.send({ to: invoice.customer.email, subject: renderTemplate(template.subject, values).replace(/[\r\n]/g, " "), text: renderTemplate(template.body, values) });
          } catch {
            /** 
             * If validation or sending throws an error, the scheduler marks the reminder as failed
             * increments the failure counter, and continues with the next reminder. 
             * */
            await repository.finishReminder(reminder.reminderId, "failed", now); counts.failed++; continue;
          }
          /** updates the reminder status and sets sentAt to the supplied now */
          await repository.finishReminder(reminder.reminderId, "sent", now); counts.remindersSent++;
        }
        /**
         * Process pending administrator notifications
         * Send email and update notification status
         */
        for (const notification of await repository.pendingNotifications(business.administratorId)) {
          /** The scheduler maps the notification's type to its corresponding business setting. */
          const enabled = { invoice_issued: settings.adminNotificationInvoiceIssuedEnabled, payment_received: settings.adminNotificationPaymentReceivedEnabled, invoice_overdue: settings.adminNotificationOverdueEnabled, invoice_significantly_overdue: settings.adminNotificationSignificantlyOverdueEnabled, contract_expiring_soon: settings.adminNotificationContractExpiringSoonEnabled }[notification.type];
          if (!enabled) continue;
          /** This prevents an expiration notification from being sent when the contract no longer qualifies. */
          if (notification.type === "contract_expiring_soon" && (!notification.contract || notification.contract.isArchived || notification.contract.status !== "active" || daysBetween(now, notification.contract.endDate) < 0 || daysBetween(now, notification.contract.endDate) > policy.contractExpiringSoonDays)) continue;
          /** This avoids sending overdue notifications for missing invoices or invoices that are no longer overdue. */
          if ((notification.type === "invoice_overdue" || notification.type === "invoice_significantly_overdue") && (!notification.invoice || !invoiceBalance(notification.invoice, now).isOverdue)) continue;
          /** The service finds the admin_notification template, or falls back to a default: */
          const template = business.emailTemplates.find(template => template.templateType === "admin_notification") ?? { subject: "{{notificationType}}", body: "{{notificationType}}: {{invoiceNumber}}{{contractTitle}}" };
          const invoice = notification.invoice;
          /** These values support different notification types using one template-processing flow. */
          const values = { notificationType: notification.type, businessName: business.businessName, customerName: invoice?.customer.name ?? notification.contract?.customer.name ?? "", invoiceNumber: invoice?.invoiceNumber ?? "", remainingBalance: invoice ? invoiceBalance(invoice, now).remainingBalance.toFixed(2) : "", paymentAmount: notification.payment?.amount.toFixed(2) ?? "", contractTitle: notification.contract?.title ?? "", expirationDate: notification.contract ? dateOnly(notification.contract.endDate) : "" };
          try {
            validateTemplate(template);
            await this.email.send({ to: business.administrator.email, subject: renderTemplate(template.subject, values).replace(/[\r\n]/g, " "), text: renderTemplate(template.body, values) });
          } catch {
            /** sets the status to failed, records a failure reason, and increments counts.failed. */
            await repository.finishNotification(notification.notificationId, false, now); counts.failed++; continue;
          }
           /** sets the status to sent and records sentAt  */
          await repository.finishNotification(notification.notificationId, true, now); counts.notificationsSent++;
        }
      }
      return counts;
      /** example of the return: 
                 * {
            "remindersSent": 8,
            "notificationsSent": 3,
            "failed": 1
          }
       */
    });
  }
}
