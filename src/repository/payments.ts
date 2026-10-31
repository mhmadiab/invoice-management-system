import type { IPaymentRepository } from "@/types/repositories";
import type { Prisma } from "@/app/generated/prisma/client";
import type { Database } from "./transaction";

export class PrismaPaymentRepository implements IPaymentRepository {
  constructor(private readonly resolveDatabase: () => Database) {}

  private get database(): Database { return this.resolveDatabase(); }

  /** create payment in prisma */
  create(data: Prisma.PaymentUncheckedCreateInput) { return this.database.payment.create({ data }); }

  /**
   * Find Payments
    WHERE Payment filters match
    AND their Invoice belongs to this Business
    AND their Invoice belongs to this Customer (if specified)
    ORDER BY newest payment first
   */
  list(businessId: bigint, where: Omit<Prisma.PaymentWhereInput, "invoice">, customerId?: bigint) { return this.database.payment.findMany({
      where: { ...where, invoice: { businessId, customerId } }, orderBy: [{ paymentDate: "desc" }, { paymentId: "desc" }],
    }); }
}
