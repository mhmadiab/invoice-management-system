import type { ICustomerRepository, IUnitOfWork } from "@/types/repositories";
import type { ICustomerService } from "@/types/services";
import { Prisma, type Customer } from "@/app/generated/prisma/client";
import type { Actor } from "@/types/context";
import type { CreateCustomerInput, CustomerQuery, UpdateCustomerInput } from "@/types/customers";
import { conflict, required } from "@/types/errors";
import { pagination } from "./pagination";

export function customerDto(customer: Customer) {
  return { id: customer.customerId, name: customer.name, email: customer.email, phone: customer.phone, billingAddress: customer.address, type: customer.customerType, status: customer.status, createdAt: customer.createdAt, updatedAt: customer.updatedAt };
}

export class CustomerService implements ICustomerService {
  constructor(
    private readonly customers: ICustomerRepository,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async createCustomer(actor: Actor, input: CreateCustomerInput) {
    return { data: customerDto(await this.customers.create({ businessId: actor.businessId, name: input.name, email: input.email, phone: input.phone, address: input.billingAddress, customerType: input.type })) };
  }

  async listCustomers(actor: Actor, query: CustomerQuery) {
    return this.unitOfWork.run(async repositories => {
      const { rows, count } = await repositories.customers.list(actor.businessId, query);
      return { data: rows.map(customerDto), pagination: pagination(query, count) };
    });
  }

  async getCustomer(actor: Actor, id: bigint) {
    return { data: customerDto(required(await this.customers.get(actor.businessId, id), "customer")) };
  }

  async updateCustomer(actor: Actor, id: bigint, input: UpdateCustomerInput) {
    return this.unitOfWork.run(async repositories => {
      const repository = repositories.customers;
      required(await repository.get(actor.businessId, id), "customer");
      return { data: customerDto(await repository.update(actor.businessId, id, { name: input.name, email: input.email, phone: input.phone, address: input.billingAddress, customerType: input.type })) };
    });
  }

  async setCustomerArchived(actor: Actor, id: bigint, archived: boolean) {
    return this.unitOfWork.run(async repositories => {
      const repository = repositories.customers;
      const customer = required(await repository.get(actor.businessId, id), "customer");
      if ((customer.status === "archived") === archived) conflict(archived ? "CUSTOMER_ALREADY_ARCHIVED" : "CUSTOMER_NOT_ARCHIVED", archived ? "Customer is already archived." : "Customer is not archived.");
      if (archived) {
        const invoices = await repository.unpaidInvoices(actor.businessId, id);
        if (invoices.some(invoice => invoice.totalAmount.gt(invoice.payments.reduce((sum, payment) => sum.add(payment.amount), new Prisma.Decimal(0))))) {
          conflict("CUSTOMER_HAS_UNPAID_INVOICES", "Customer cannot be archived while active unpaid invoices exist.");
        }
      }
      return { data: customerDto(await repository.update(actor.businessId, id, { status: archived ? "archived" : "active" })) };
    });
  }
}
