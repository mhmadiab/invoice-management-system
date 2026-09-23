import { Pool } from "pg";
import type { NotificationType, Prisma, ReminderType } from "@/app/generated/prisma/client";
import { getPrisma } from "@/prisma/client";

// Prisma cannot express session advisory locks. This locks only the worker and
// uses no raw SQL for application records or financial calculations.
export async function withSchedulerLock<T>(run: () => Promise<T>) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const connection = await pool.connect();
  try {
    const lock = await connection.query<{ locked: boolean }>("SELECT pg_try_advisory_lock($1) AS locked", [73194001]);
    if (!lock.rows[0].locked) return null;
    try { return await run(); }
    finally { await connection.query("SELECT pg_advisory_unlock($1)", [73194001]); }
  } finally { connection.release(); await pool.end(); }
}

export function schedulerRepository() {
  const database = getPrisma();
  return {
    businesses: () => database.business.findMany({ include: { administrator: true, systemSettings: true, emailTemplates: true } }),
    invoices: (businessId: bigint) => database.invoice.findMany({ where: { businessId, status: { in: ["issued", "partially_paid"] } }, include: { payments: true, customer: true } }),
    contracts: (businessId: bigint) => database.contract.findMany({ where: { businessId, isArchived: false, status: "active" }, include: { customer: true } }),
    schedule: (invoiceId: bigint, reminderType: ReminderType, scheduledAt: Date) => database.reminder.upsert({ where: { invoiceId_reminderType_scheduledAt: { invoiceId, reminderType, scheduledAt } }, create: { invoiceId, reminderType, scheduledAt }, update: {} }),
    scheduled: (businessId: bigint, now: Date) => database.reminder.findMany({ where: { invoice: { businessId }, status: "scheduled", scheduledAt: { lte: now } }, include: { invoice: { include: { customer: true, payments: true } } }, orderBy: { scheduledAt: "asc" } }),
    finishReminder: (reminderId: bigint, status: "sent" | "failed" | "cancelled", now: Date) => database.reminder.update({ where: { reminderId }, data: { status, sentAt: status === "sent" ? now : null } }),
    notificationExists: (administratorId: bigint, type: NotificationType, invoiceId?: bigint, contractId?: bigint) => database.administratorNotification.findFirst({ where: { administratorId, type, invoiceId, contractId }, select: { notificationId: true } }),
    createNotification: (data: Prisma.AdministratorNotificationUncheckedCreateInput) => database.administratorNotification.create({ data }),
    pendingNotifications: (administratorId: bigint) => database.administratorNotification.findMany({ where: { administratorId, status: "pending" }, include: { invoice: { include: { payments: true, customer: true } }, payment: true, contract: { include: { customer: true } } }, orderBy: { notificationId: "asc" } }),
    finishNotification: (notificationId: bigint, success: boolean, now: Date) => database.administratorNotification.update({ where: { notificationId }, data: { status: success ? "sent" : "failed", sentAt: success ? now : null, failureReason: success ? null : "Administrator email delivery failed." } }),
  };
}
