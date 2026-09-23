import type { Prisma } from "@/app/generated/prisma/client";
import { getPrisma } from "@/prisma/client";
import type { Database } from "./transaction";

export function reminderRepository(database: Database = getPrisma()) {
  return {
    list: (businessId: bigint, invoiceId: bigint, filter: Omit<Prisma.ReminderWhereInput, "invoice" | "invoiceId">) => database.reminder.findMany({ where: { ...filter, invoiceId, invoice: { businessId } }, orderBy: [{ scheduledAt: "desc" }, { reminderId: "desc" }] }),
  };
}
