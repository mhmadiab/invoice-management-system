import type { AdministratorNotification, Reminder } from "@/app/generated/prisma/client";
import { invoiceRepository } from "@/repository/invoices";
import { reminderRepository } from "@/repository/reminders";
import { notificationRepository } from "@/repository/notifications";
import { transaction } from "@/repository/transaction";
import type { Actor } from "@/types/context";
import type { NotificationQuery, ReminderQuery } from "@/types/history";
import { required } from "@/types/errors";
import { asDate, DAY_MS } from "./dates";
import { paginate } from "./pagination";

export const reminderDto = (reminder: Reminder) => ({ id: reminder.reminderId, invoiceId: reminder.invoiceId, type: reminder.reminderType, scheduledAt: reminder.scheduledAt, sentAt: reminder.sentAt, status: reminder.status });
export const notificationDto = (notification: AdministratorNotification) => ({ id: notification.notificationId, type: notification.type, status: notification.status, invoiceId: notification.invoiceId, paymentId: notification.paymentId, contractId: notification.contractId, createdAt: notification.createdAt, sentAt: notification.sentAt, failureReason: notification.failureReason });
export async function invoiceReminders(actor: Actor, invoiceId: bigint, query: ReminderQuery) {
  return transaction(async database => {
    required(await invoiceRepository(database).get(actor.businessId, invoiceId), "resource");
    const rows = await reminderRepository(database).list(actor.businessId, invoiceId, { status: query.status, reminderType: query.type });
    return paginate(rows.map(reminderDto), query);
  });
}
export async function listNotifications(actor: Actor, query: NotificationQuery) {
  const rows = await notificationRepository().list(actor.administratorId, {
    type: query.type, status: query.status,
    ...(query.dateFrom || query.dateTo ? { createdAt: { gte: query.dateFrom ? asDate(query.dateFrom) : undefined, lt: query.dateTo ? new Date(asDate(query.dateTo).getTime() + DAY_MS) : undefined } } : {}),
  });
  return paginate(rows.map(notificationDto), query);
}
export async function getNotification(actor: Actor, id: bigint) {
  return { data: notificationDto(required(await notificationRepository().get(actor.administratorId, id), "resource")) };
}
