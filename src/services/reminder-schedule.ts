import type { Invoice, SystemSetting, ReminderType } from "@/app/generated/prisma/client";
import { DAY_MS, today } from "./dates";
import { overdueDays } from "./settings";

export function reminderSchedule(invoice: Pick<Invoice, "dueDate" | "issueDate">, settings: SystemSetting, now: Date) {
  const schedule: { type: ReminderType; at: Date }[] = [];
  const add = (type: ReminderType, offset: number) => {
    const at = new Date(invoice.dueDate.getTime() + offset * DAY_MS);
    if (at >= today(now) && (!invoice.issueDate || at >= invoice.issueDate)) schedule.push({ type, at });
  };
  if (settings.reminderPreDueEnabled && settings.reminderPreDueDays !== null) add("pre_due", -settings.reminderPreDueDays);
  if (settings.reminderDueDateEnabled) add("due_date", 0);
  if (settings.reminderOverdueEnabled) for (const day of overdueDays(settings.reminderOverdueDays)) add("overdue", day);
  return schedule;
}

export function reminderEnabled(type: ReminderType, scheduledAt: Date, dueDate: Date, settings: SystemSetting) {
  const offset = Math.round((scheduledAt.getTime() - dueDate.getTime()) / DAY_MS);
  if (type === "pre_due") return settings.reminderPreDueEnabled && settings.reminderPreDueDays !== null && offset === -settings.reminderPreDueDays;
  if (type === "due_date") return settings.reminderDueDateEnabled && offset === 0;
  return settings.reminderOverdueEnabled && overdueDays(settings.reminderOverdueDays).includes(offset);
}
