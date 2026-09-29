import type { IContractRepository, IUnitOfWork } from "@/types/repositories";
import { randomUUID } from "node:crypto";
import type { Contract } from "@/app/generated/prisma/client";
import type { Actor } from "@/types/context";
import type { ContractQuery, CreateContractInput, UpdateContractInput } from "@/types/contracts";
import { conflict, invalid, required } from "@/types/errors";
import { asDate, dateOnly, today } from "./dates";
import { pagination } from "./pagination";

export function contractDto(contract: Contract) {
  return { id: contract.contractId, customerId: contract.customerId, contractNumber: contract.contractNumber, title: contract.title, description: contract.description, startDate: dateOnly(contract.startDate), expirationDate: dateOnly(contract.endDate), contractValue: contract.contractValue, billingFrequency: contract.billingFrequency, status: contract.status, isArchived: contract.isArchived, createdAt: contract.createdAt, updatedAt: contract.updatedAt };
}

export class ContractService {
  constructor(
    private readonly contracts: IContractRepository,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async createContract(actor: Actor, input: CreateContractInput) {
    const contractNumber = `CTR-${randomUUID()}`;
    return this.unitOfWork.run(async repositories => {
      const customer = required(await repositories.customers.get(actor.businessId, input.customerId), "customer");
      if (customer.status === "archived") invalid("customerId", "Select an active customer.");
      return { data: contractDto(await repositories.contracts.create({ businessId: actor.businessId, customerId: input.customerId, contractNumber, title: input.title, description: input.description, startDate: asDate(input.startDate), endDate: asDate(input.expirationDate), contractValue: input.contractValue, billingFrequency: input.billingFrequency })) };
    });
  }

  async listContracts(actor: Actor, query: ContractQuery, customerId?: bigint) {
    return this.unitOfWork.run(async repositories => {
      if (customerId !== undefined) required(await repositories.customers.get(actor.businessId, customerId), "customer");
      const { rows, count } = await repositories.contracts.list(actor.businessId, { ...query, customerId: customerId ?? query.customerId });
      return { data: rows.map(contractDto), pagination: pagination(query, count) };
    });
  }

  async getContract(actor: Actor, id: bigint) {
    return { data: contractDto(required(await this.contracts.get(actor.businessId, id), "contract")) };
  }

  async updateContract(actor: Actor, id: bigint, input: UpdateContractInput, now = new Date()) {
    return this.unitOfWork.run(async repositories => {
      const repository = repositories.contracts;
      const contract = required(await repository.get(actor.businessId, id), "contract");
      if (contract.endDate <= today(now)) conflict("CONTRACT_EXPIRED", "An expired contract cannot be modified.");
      if (input.expirationDate && asDate(input.expirationDate) <= contract.startDate) invalid("expirationDate", "Expiration date must be after start date.");
      return { data: contractDto(await repository.update(actor.businessId, id, { title: input.title, endDate: input.expirationDate ? asDate(input.expirationDate) : undefined, contractValue: input.contractValue })) };
    });
  }

  async setContractArchived(actor: Actor, id: bigint, archived: boolean) {
    return this.unitOfWork.run(async repositories => {
      const repository = repositories.contracts;
      const contract = required(await repository.get(actor.businessId, id), "contract");
      if (contract.isArchived === archived) conflict(archived ? "CONTRACT_ALREADY_ARCHIVED" : "CONTRACT_NOT_ARCHIVED", archived ? "Contract is already archived." : "Contract is not archived.");
      return { data: contractDto(await repository.update(actor.businessId, id, { isArchived: archived })) };
    });
  }
}
