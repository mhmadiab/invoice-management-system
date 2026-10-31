import type { IContractRepository } from "@/types/repositories";
import type { Prisma } from "@/app/generated/prisma/client";
import type { Database } from "./transaction";
import type { ContractQuery } from "@/types/contracts";

export class PrismaContractRepository implements IContractRepository {
  constructor(private readonly resolveDatabase: () => Database) {}

  private get database(): Database { return this.resolveDatabase(); }

  get(businessId: bigint, contractId: bigint) { return this.database.contract.findFirst({ where: { businessId, contractId } }); }

  async list(businessId: bigint, query: ContractQuery) {
      const where: Prisma.ContractWhereInput = { businessId, customerId: query.customerId, status: query.status, isArchived: query.archived };
      const [rows, count] = await Promise.all([
        this.database.contract.findMany({ where, orderBy: { contractId: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
        this.database.contract.count({ where }),
      ]);
      return { rows, count };
    }

  create(data: Prisma.ContractUncheckedCreateInput) { return this.database.contract.create({ data }); }

  update(businessId: bigint, contractId: bigint, data: Prisma.ContractUpdateInput) { return this.database.contract.update({ where: { contractId, businessId }, data }); }
}
