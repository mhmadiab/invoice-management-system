import type { Prisma } from "@/app/generated/prisma/client";
import { getPrisma } from "@/prisma/client";
import type { Database } from "./transaction";

export function paymentRepository(database: Database = getPrisma()) {
  return {
    create: (data: Prisma.PaymentUncheckedCreateInput) => database.payment.create({ data }),
    list: (businessId: bigint, where: Omit<Prisma.PaymentWhereInput, "invoice">, customerId?: bigint) => database.payment.findMany({
      where: { ...where, invoice: { businessId, customerId } }, orderBy: [{ paymentDate: "desc" }, { paymentId: "desc" }],
    }),
  };
}
