import type { ICustomerRepository } from "@/types/repositories";
import type { Prisma } from "@/app/generated/prisma/client";
import type { Database } from "./transaction";
import type { CustomerQuery } from "@/types/customers";


//Data Access layer for customers
export class PrismaCustomerRepository implements ICustomerRepository {

/**
Instead of storing a fixed Prisma client, it receives a function capable of returning the current Database.
This matters because the same repository can operate either with the normal database connection 
or with the transaction client supplied by your PrismaUnitOfWork. 
*/
  constructor(private readonly resolveDatabase: () => Database) {}

  private get database(): Database { return this.resolveDatabase(); }

  /**This retrieves one customer.
   * use business id (will come from authenticate actor.businessid) + customer id 
   * for later multi-business architecture.
   */
  get(businessId: bigint, customerId: bigint) { return this.database.customer.findFirst({ where: { businessId, customerId } }); }

  /** retreives filtered list of customers also based on the auth actor provided the business id */
  async list(businessId: bigint, query: CustomerQuery) {
      /** building the where based on the zod type for customerQuery */
      const where: Prisma.CustomerWhereInput = { businessId, status: query.status, ...(query.search ? { name: { contains: query.search, mode: "insensitive" } } : {}) };
      const [rows, count] = await Promise.all([
        /** retrieves the requested page */
        this.database.customer.findMany({ where, orderBy: { customerId: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
        /** counts all matching customers */
        this.database.customer.count({ where }),
      ]);
      return { rows, count };
    }

  create(data: Prisma.CustomerUncheckedCreateInput) { return this.database.customer.create({ data }); }

  update(businessId: bigint, customerId: bigint, data: Prisma.CustomerUpdateInput) { return this.database.customer.update({ where: { customerId, businessId }, data }); }

  /** retreives the related(customerid + businessid) invoices which are not closed yet 
   * The repository provides the raw database information; the service should perform the business calculation.
  */
  unpaidInvoices(businessId: bigint, customerId: bigint) { return this.database.invoice.findMany({
      where: { businessId, customerId, status: { in: ["issued", "partially_paid"] } },
      select: { totalAmount: true, payments: { select: { amount: true } } },
    }); }
}
