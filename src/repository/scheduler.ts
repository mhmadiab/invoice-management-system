import type { ISchedulerRepository, ISchedulerLock } from "@/types/repositories";
import type { Database } from "./transaction";
import { Pool } from "pg";
import type { NotificationType, Prisma, ReminderType } from "@/app/generated/prisma/client";
import config from "@/config";

// Prisma cannot express session advisory locks. This locks only the worker and
// uses no raw SQL for application records or financial calculations.


/**
 * This coordinates scheduler execution using a PostgreSQL advisory lock, so two workers that use the same 
 * lock cannot process the same scheduler run simultaneously.
 */
export class PostgresSchedulerLock implements ISchedulerLock {
  async run<T>(run: () => Promise<T>) {
    const pool = new Pool({ connectionString: config.database.url, max: 1 });
    const connection = await pool.connect();
    try {
      /** 
       * pg_try_advisory_lock($1) reports whether a lock is aquired or not 
       * Both workers must use the same PostgreSQL database and lock key for this coordination to work.
      */
      const lock = await connection.query<{ locked: boolean }>("SELECT pg_try_advisory_lock($1) AS locked", [73194001]);
      if (!lock.rows[0].locked) return null;
      try { return await run(); }
      /** 
       * the lock must be released by the same connection that acquired it. 
       * release the lock and close the connection even if scheduler work fails.
       * */
      finally { await connection.query("SELECT pg_advisory_unlock($1)", [73194001]); }
    } finally { connection.release(); await pool.end(); }
  }
}

export class PrismaSchedulerRepository implements ISchedulerRepository {
  constructor(private readonly resolveDatabase: () => Database) {}

  private get database(): Database { return this.resolveDatabase(); }

  businesses() { return this.database.business.findMany({ include: { administrator: true, systemSettings: true, emailTemplates: true } }); }

  invoices(businessId: bigint) { return this.database.invoice.findMany({ where: { businessId, status: { in: ["issued", "partially_paid"] } }, include: { payments: true, customer: true } }); }

  /** 
   * It selects contracts that are:
  - Belonging to the business.
  - Not archived.
  - Currently active.
  This directly supports the requirement that archived contracts should not participate in expiration notifications.
  */
  contracts(businessId: bigint) { return this.database.contract.findMany({ where: { businessId, isArchived: false, status: "active" }, include: { customer: true } }); }

  /** 
   * The upsert() behavior is:
   * If the matching reminder exists, return it without changing it.
    * If it does not exist, create it with the default reminder status defined by your schema.
   */
  schedule(invoiceId: bigint, reminderType: ReminderType, scheduledAt: Date) { return this.database.reminder.upsert({ where: { invoiceId_reminderType_scheduledAt: { invoiceId, reminderType, scheduledAt } }, create: { invoiceId, reminderType, scheduledAt }, update: {} }); }

  /**
   * retrieves reminders that satisfy three conditions, oldest first:
    1. The associated invoice belongs to the current business.
    2. The reminder's status is scheduled.
    3. Its scheduled time is less than or equal to now.
   */
  scheduled(businessId: bigint, now: Date) { return this.database.reminder.findMany({ where: { invoice: { businessId }, status: "scheduled", scheduledAt: { lte: now } }, include: { invoice: { include: { customer: true, payments: true } } }, orderBy: { scheduledAt: "asc" } }); }

  /** Update the stored status to becomes the record of what the scheduler did. */
  finishReminder(reminderId: bigint, status: "sent" | "failed" | "cancelled", now: Date) { return this.database.reminder.update({ where: { reminderId }, data: { status, sentAt: status === "sent" ? now : null } }); }

  /** checks the administrator, notification type, invoice ID, and contract ID */
  notificationExists(administratorId: bigint, type: NotificationType, invoiceId?: bigint, contractId?: bigint) { return this.database.administratorNotification.findFirst({ where: { administratorId, type, invoiceId, contractId }, select: { notificationId: true } }); }

  createNotification(data: Prisma.AdministratorNotificationUncheckedCreateInput) { return this.database.administratorNotification.create({ data }); }

  /** retreive records that are already created by other parts of your application or by the scheduler's earlier queueing step. */
  pendingNotifications(administratorId: bigint) { return this.database.administratorNotification.findMany({ where: { administratorId, status: "pending" }, include: { invoice: { include: { payments: true, customer: true } }, payment: true, contract: { include: { customer: true } } }, orderBy: { notificationId: "asc" } }); }

  /** the stored status becomes the record of what the scheduler did */
  finishNotification(notificationId: bigint, success: boolean, now: Date) { return this.database.administratorNotification.update({ where: { notificationId }, data: { status: success ? "sent" : "failed", sentAt: success ? now : null, failureReason: success ? null : "Administrator email delivery failed." } }); }
}
