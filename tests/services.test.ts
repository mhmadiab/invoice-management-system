import test from "node:test";
import assert from "node:assert/strict";
import { Prisma, type Customer } from "@/app/generated/prisma/client";
import { CustomerService } from "@/services/customers";
import type { ICustomerRepository, IUnitOfWork, RepositoryContext } from "@/types/repositories";
import type { ICustomerService } from "@/types/services";

const actor = { administratorId: 1n, businessId: 2n, sessionId: 3n };
const customer: Customer = {
  customerId: 4n, businessId: actor.businessId, name: "Customer", email: "customer@example.com",
  phone: null, address: null, customerType: "individual", status: "active",
  createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"),
};

class CustomerRepositoryStub implements ICustomerRepository {
  updates = 0;
  scopes: bigint[] = [];
  invoices: Awaited<ReturnType<ICustomerRepository["unpaidInvoices"]>> = [];
  async get(businessId: bigint, id: bigint) {
    this.scopes.push(businessId);
    return businessId === customer.businessId && id === customer.customerId ? customer : null;
  }
  async list() { return { rows: [customer], count: 1 }; }
  async create(): Promise<Customer> { throw new Error("Unexpected create"); }
  async update(businessId: bigint) {
    this.scopes.push(businessId);
    this.updates++;
    return { ...customer, status: "archived" as const };
  }
  async unpaidInvoices(businessId: bigint) {
    this.scopes.push(businessId);
    return this.invoices;
  }
}

class CustomerUnitOfWork implements IUnitOfWork {
  calls = 0;
  constructor(private readonly customers: ICustomerRepository) {}
  async run<T>(work: (repositories: RepositoryContext) => Promise<T>): Promise<T> {
    this.calls++;
    // Fail immediately if the service unexpectedly accesses another repository.
    const context = new Proxy({ customers: this.customers } as RepositoryContext, {
      get(target, name) {
        if (name !== "customers") throw new Error(`Unexpected repository: ${String(name)}`);
        return target.customers;
      },
    });
    return work(context);
  }
}

test("CustomerService rejects archiving with an outstanding balance before writing", async () => {
  const repository = new CustomerRepositoryStub();
  repository.invoices = [{ totalAmount: new Prisma.Decimal(100), payments: [{ amount: new Prisma.Decimal(99.99) }] }];
  const transaction = new CustomerUnitOfWork(repository);
  const service: ICustomerService = new CustomerService(repository, transaction);
  await assert.rejects(service.setCustomerArchived(actor, customer.customerId, true), { code: "CUSTOMER_HAS_UNPAID_INVOICES" });
  assert.equal(repository.updates, 0);
  assert.equal(transaction.calls, 1);
  assert.deepEqual(repository.scopes, [actor.businessId, actor.businessId]);
});

test("CustomerService uses only transaction-scoped repositories for archive writes", async () => {
  const outside = new CustomerRepositoryStub();
  const inside = new CustomerRepositoryStub();
  inside.invoices = [{ totalAmount: new Prisma.Decimal(100), payments: [{ amount: new Prisma.Decimal(100) }] }];
  const service = new CustomerService(outside, new CustomerUnitOfWork(inside));
  const result = await service.setCustomerArchived(actor, customer.customerId, true);
  assert.equal(result.data.status, "archived");
  assert.equal(inside.updates, 1);
  assert.equal(outside.updates, 0);
  assert.deepEqual(outside.scopes, []);
  assert.deepEqual(inside.scopes, [actor.businessId, actor.businessId, actor.businessId]);
});

test("CustomerService scopes reads to the authenticated business", async () => {
  const repository = new CustomerRepositoryStub();
  const service = new CustomerService(repository, new CustomerUnitOfWork(repository));
  await assert.rejects(service.getCustomer({ ...actor, businessId: 999n }, customer.customerId), { code: "CUSTOMER_NOT_FOUND" });
  assert.deepEqual(repository.scopes, [999n]);
});
