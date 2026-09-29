import type { IReminderRepository } from "@/types/repositories";
import type { Prisma } from "@/app/generated/prisma/client";
import type { Database } from "./transaction";

export class PrismaReminderRepository implements IReminderRepository {
  constructor(private readonly resolveDatabase: () => Database) {}

  private get database(): Database { return this.resolveDatabase(); }

  list(businessId: bigint, invoiceId: bigint, filter: Omit<Prisma.ReminderWhereInput, "invoice" | "invoiceId">) { return this.database.reminder.findMany({ where: { ...filter, invoiceId, invoice: { businessId } }, orderBy: [{ scheduledAt: "desc" }, { reminderId: "desc" }] }); }
}
