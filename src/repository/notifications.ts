import type { INotificationRepository } from "@/types/repositories";
import type { Prisma } from "@/app/generated/prisma/client";
import type { Database } from "./transaction";

export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly resolveDatabase: () => Database) {}

  private get database(): Database { return this.resolveDatabase(); }

  create(data: Prisma.AdministratorNotificationUncheckedCreateInput) { return this.database.administratorNotification.create({ data }); }

  get(administratorId: bigint, notificationId: bigint) { return this.database.administratorNotification.findFirst({ where: { administratorId, notificationId } }); }

  list(administratorId: bigint, filter: Omit<Prisma.AdministratorNotificationWhereInput, "administratorId">) { return this.database.administratorNotification.findMany({ where: { ...filter, administratorId }, orderBy: [{ createdAt: "desc" }, { notificationId: "desc" }] }); }
}
