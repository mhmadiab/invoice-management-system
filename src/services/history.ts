import type { INotificationRepository, IUnitOfWork } from "@/types/repositories";
import type { AdministratorNotification, Reminder } from "@/app/generated/prisma/client";
import type { Actor } from "@/types/context";
import type { NotificationQuery, ReminderQuery } from "@/types/history";
import { required } from "@/types/errors";
import { asDate, DAY_MS } from "./dates";
import { paginate } from "./pagination";

export const reminderDto = (reminder: Reminder) => ({ id: reminder.reminderId, invoiceId: reminder.invoiceId, type: reminder.reminderType, scheduledAt: reminder.scheduledAt, sentAt: reminder.sentAt, status: reminder.status });
export const notificationDto = (notification: AdministratorNotification) => ({ id: notification.notificationId, type: notification.type, status: notification.status, invoiceId: notification.invoiceId, paymentId: notification.paymentId, contractId: notification.contractId, createdAt: notification.createdAt, sentAt: notification.sentAt, failureReason: notification.failureReason });

export class HistoryService {
  constructor(
    private readonly notifications: INotificationRepository,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async invoiceReminders(actor: Actor, invoiceId: bigint, query: ReminderQuery) {
    return this.unitOfWork.run(async repositories => {
      required(await repositories.invoices.get(actor.businessId, invoiceId), "resource");
      const rows = await repositories.reminders.list(actor.businessId, invoiceId, { status: query.status, reminderType: query.type });
      return paginate(rows.map(reminderDto), query);
    });
  }

  async listNotifications(actor: Actor, query: NotificationQuery) {
    const rows = await this.notifications.list(actor.administratorId, {
      type: query.type, status: query.status,
      ...(query.dateFrom || query.dateTo ? { createdAt: { gte: query.dateFrom ? asDate(query.dateFrom) : undefined, lt: query.dateTo ? new Date(asDate(query.dateTo).getTime() + DAY_MS) : undefined } } : {}),
    });
    return paginate(rows.map(notificationDto), query);
  }

  async getNotification(actor: Actor, id: bigint) {
    return { data: notificationDto(required(await this.notifications.get(actor.administratorId, id), "resource")) };
  }
}
