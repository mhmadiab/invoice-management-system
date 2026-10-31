import type { IDeliveryRepository } from "@/types/repositories";
import type { Prisma } from "@/app/generated/prisma/client";
import type { Database } from "./transaction";

export class PrismaDeliveryRepository implements IDeliveryRepository {
  constructor(private readonly resolveDatabase: () => Database) {}

  private get database(): Database { return this.resolveDatabase(); }

  create(invoiceId: bigint, recipientEmail: string) { return this.database.invoiceDelivery.create({ data: { invoiceId, recipientEmail, status: "pending" } }); }

  update(deliveryId: bigint, data: Prisma.InvoiceDeliveryUpdateInput) { return this.database.invoiceDelivery.update({ where: { deliveryId }, data }); }

  list(businessId: bigint, invoiceId: bigint) { return this.database.invoiceDelivery.findMany({ where: { invoiceId, invoice: { businessId } }, orderBy: { deliveryId: "desc" } }); }
}
