import type { Prisma } from "@/app/generated/prisma/client";
import { getPrisma } from "@/prisma/client";
import type { Database } from "./transaction";
import type { CustomerQuery } from "@/types/customers";

export function customerRepository(database: Database = getPrisma()) {
  return {
    get: (businessId: bigint, customerId: bigint) => database.customer.findFirst({ where: { businessId, customerId } }),
    list: async (businessId: bigint, query: CustomerQuery) => {
      const where: Prisma.CustomerWhereInput = { businessId, status: query.status, ...(query.search ? { name: { contains: query.search, mode: "insensitive" } } : {}) };
      const [rows, count] = await Promise.all([
        database.customer.findMany({ where, orderBy: { customerId: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
        database.customer.count({ where }),
      ]);
      return { rows, count };
    },
    create: (data: Prisma.CustomerUncheckedCreateInput) => database.customer.create({ data }),
    update: (businessId: bigint, customerId: bigint, data: Prisma.CustomerUpdateInput) => database.customer.update({ where: { customerId, businessId }, data }),
    unpaidInvoices: (businessId: bigint, customerId: bigint) => database.invoice.findMany({
      where: { businessId, customerId, status: { in: ["issued", "partially_paid"] } },
      select: { totalAmount: true, payments: { select: { amount: true } } },
    }),
  };
}
