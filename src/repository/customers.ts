import type { ICustomerRepository } from "@/types/repositories";
import type { Prisma } from "@/app/generated/prisma/client";
import type { Database } from "./transaction";
import type { CustomerQuery } from "@/types/customers";

export class PrismaCustomerRepository implements ICustomerRepository {
  constructor(private readonly resolveDatabase: () => Database) {}

  private get database(): Database { return this.resolveDatabase(); }

  get(businessId: bigint, customerId: bigint) { return this.database.customer.findFirst({ where: { businessId, customerId } }); }

  async list(businessId: bigint, query: CustomerQuery) {
      const where: Prisma.CustomerWhereInput = { businessId, status: query.status, ...(query.search ? { name: { contains: query.search, mode: "insensitive" } } : {}) };
      const [rows, count] = await Promise.all([
        this.database.customer.findMany({ where, orderBy: { customerId: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
        this.database.customer.count({ where }),
      ]);
      return { rows, count };
    }

  create(data: Prisma.CustomerUncheckedCreateInput) { return this.database.customer.create({ data }); }

  update(businessId: bigint, customerId: bigint, data: Prisma.CustomerUpdateInput) { return this.database.customer.update({ where: { customerId, businessId }, data }); }

  unpaidInvoices(businessId: bigint, customerId: bigint) { return this.database.invoice.findMany({
      where: { businessId, customerId, status: { in: ["issued", "partially_paid"] } },
      select: { totalAmount: true, payments: { select: { amount: true } } },
    }); }
}
