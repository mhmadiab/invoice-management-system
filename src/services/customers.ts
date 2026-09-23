import { Prisma, type Customer } from "@/app/generated/prisma/client";
import { customerRepository } from "@/repository/customers";
import { transaction } from "@/repository/transaction";
import type { Actor } from "@/types/context";
import type { CreateCustomerInput, CustomerQuery, UpdateCustomerInput } from "@/types/customers";
import { conflict, required } from "@/types/errors";
import { pagination } from "./pagination";

export function customerDto(customer: Customer) {
  return { id: customer.customerId, name: customer.name, email: customer.email, phone: customer.phone, billingAddress: customer.address, type: customer.customerType, status: customer.status, createdAt: customer.createdAt, updatedAt: customer.updatedAt };
}

export async function createCustomer(actor: Actor, input: CreateCustomerInput) {
  return { data: customerDto(await customerRepository().create({ businessId: actor.businessId, name: input.name, email: input.email, phone: input.phone, address: input.billingAddress, customerType: input.type })) };
}
export async function listCustomers(actor: Actor, query: CustomerQuery) {
  return transaction(async database => {
    const { rows, count } = await customerRepository(database).list(actor.businessId, query);
    return { data: rows.map(customerDto), pagination: pagination(query, count) };
  });
}
export async function getCustomer(actor: Actor, id: bigint) {
  return { data: customerDto(required(await customerRepository().get(actor.businessId, id), "customer")) };
}
export async function updateCustomer(actor: Actor, id: bigint, input: UpdateCustomerInput) {
  return transaction(async database => {
    const repository = customerRepository(database);
    required(await repository.get(actor.businessId, id), "customer");
    return { data: customerDto(await repository.update(actor.businessId, id, { name: input.name, email: input.email, phone: input.phone, address: input.billingAddress, customerType: input.type })) };
  });
}
export async function setCustomerArchived(actor: Actor, id: bigint, archived: boolean) {
  return transaction(async database => {
    const repository = customerRepository(database);
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
