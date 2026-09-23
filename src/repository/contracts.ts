import type { Prisma } from "@/app/generated/prisma/client";
import { getPrisma } from "@/prisma/client";
import type { Database } from "./transaction";
import type { ContractQuery } from "@/types/contracts";

export function contractRepository(database: Database = getPrisma()) {
  return {
    get: (businessId: bigint, contractId: bigint) => database.contract.findFirst({ where: { businessId, contractId } }),
    list: async (businessId: bigint, query: ContractQuery) => {
      const where: Prisma.ContractWhereInput = { businessId, customerId: query.customerId, status: query.status, isArchived: query.archived };
      const [rows, count] = await Promise.all([
        database.contract.findMany({ where, orderBy: { contractId: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
        database.contract.count({ where }),
      ]);
      return { rows, count };
    },
    create: (data: Prisma.ContractUncheckedCreateInput) => database.contract.create({ data }),
    update: (businessId: bigint, contractId: bigint, data: Prisma.ContractUpdateInput) => database.contract.update({ where: { contractId, businessId }, data }),
  };
}
