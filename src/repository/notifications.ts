import type { Prisma } from "@/app/generated/prisma/client";
import { getPrisma } from "@/prisma/client";
import type { Database } from "./transaction";

export function notificationRepository(database: Database = getPrisma()) {
  return {
    create: (data: Prisma.AdministratorNotificationUncheckedCreateInput) => database.administratorNotification.create({ data }),
    get: (administratorId: bigint, notificationId: bigint) => database.administratorNotification.findFirst({ where: { administratorId, notificationId } }),
    list: (administratorId: bigint, filter: Omit<Prisma.AdministratorNotificationWhereInput, "administratorId">) => database.administratorNotification.findMany({ where: { ...filter, administratorId }, orderBy: [{ createdAt: "desc" }, { notificationId: "desc" }] }),
  };
}
