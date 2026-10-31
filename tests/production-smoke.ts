import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { getPrisma } from "@/prisma/client";
import config from "@/config";

assert.equal(new URL(config.database.url ?? "").pathname, "/invoice_api_test", "Smoke tests require the isolated test database.");
const base = new URL(config.tests.baseUrl);
assert.ok(["127.0.0.1", "localhost"].includes(base.hostname), "Smoke tests only target a local server.");
const database = getPrisma();
const email = `smoke-${randomUUID()}@example.com`;
const password = "ProductionSmokeTest123!";

try {
  await database.administrator.create({ data: { email, passwordHash: await bcrypt.hash(password, 4), business: { create: { businessName: "Production smoke test", email, currency: "USD" } } } });
  const login = await fetch(new URL("/api/v1/auth/login", base), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  assert.equal(login.status, 200);
  const authenticated = await login.json() as { accessToken: string };
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${authenticated.accessToken}` };
  const customer = await fetch(new URL("/api/v1/customers", base), { method: "POST", headers, body: JSON.stringify({ name: "Smoke customer", email: `customer-${email}` }) });
  assert.equal(customer.status, 201);
  const createdCustomer = await customer.json() as { data: { id: number } };
  const invoice = await fetch(new URL("/api/v1/invoices", base), { method: "POST", headers, body: JSON.stringify({ customerId: createdCustomer.data.id, dueDate: "2027-01-01", items: [{ description: "Production PDF", quantity: 1, unitPrice: 10 }], taxRate: 0 }) });
  assert.equal(invoice.status, 201);
  const createdInvoice = await invoice.json() as { data: { id: number } };
  const pdf = await fetch(new URL(`/api/v1/invoices/${createdInvoice.data.id}/pdf`, base), { headers });
  assert.equal(pdf.status, 200, await pdf.clone().text());
  assert.equal(pdf.headers.get("Content-Type"), "application/pdf");
  assert.match((await pdf.text()).slice(0, 8), /%PDF/);
  const logout = await fetch(new URL("/api/v1/auth/logout", base), { method: "POST", headers });
  assert.equal(logout.status, 204);
  console.log("Production HTTP smoke passed: login, customer/invoice creation, bundled PDF generation, logout.");
} finally { await database.$disconnect(); }
