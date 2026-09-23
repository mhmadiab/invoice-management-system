import type { Prisma } from "@/app/generated/prisma/client";
import { getPrisma } from "@/prisma/client";
import type { Database } from "./transaction";

export function deliveryRepository(database: Database = getPrisma()) {
  return {
    create: (invoiceId: bigint, recipientEmail: string) => database.invoiceDelivery.create({ data: { invoiceId, recipientEmail, status: "pending" } }),
    update: (deliveryId: bigint, data: Prisma.InvoiceDeliveryUpdateInput) => database.invoiceDelivery.update({ where: { deliveryId }, data }),
    list: (businessId: bigint, invoiceId: bigint) => database.invoiceDelivery.findMany({ where: { invoiceId, invoice: { businessId } }, orderBy: { deliveryId: "desc" } }),
  };
}
