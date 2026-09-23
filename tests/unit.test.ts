import test from "node:test";
import assert from "node:assert/strict";
import { parse } from "lossless-json";
import { Prisma } from "@/app/generated/prisma/client";
import { calculateInvoice, decimal, invoiceBalance } from "@/services/financial";
import { createInvoiceSchema } from "@/types/invoices";
import { createCustomerSchema, updateCustomerSchema } from "@/types/customers";
import { contractQuerySchema } from "@/types/contracts";
import { reminderSettingsSchema } from "@/types/settings";
import { idSchema, pathIdSchema, dateSchema } from "@/types/common";
import { json, errorResponse } from "@/app/api/_lib/http";
import { validateTemplate, renderTemplate } from "@/services/templates";
import { accessToken, verifyAccessToken } from "@/services/tokens";
import { validateSession } from "@/services/auth";
import { ApplicationError } from "@/types/errors";
import { asDate } from "@/services/dates";
import { pagination } from "@/services/pagination";

test("Pagination metadata cannot expose query filters", () => {
  const query = { page: 1, pageSize: 20, status: "issued", customerId: 123n };
  assert.deepEqual(pagination(query, 21), { page: 1, pageSize: 20, totalItems: 21, totalPages: 2 });
});

test("Calculations apply discount before tax with explicit half-up rounding", () => {
  const input = createInvoiceSchema.parse(parse('{"customerId":1,"dueDate":"2026-10-01","items":[{"description":"Backend","quantity":10,"unitPrice":100},{"description":"Deployment","quantity":1,"unitPrice":500}],"discount":{"type":"percentage","value":10},"taxRate":11}'));
  const result = calculateInvoice(input.items, input.discount, input.taxRate!);
  assert.equal(result.subtotal.toFixed(2), "1500.00");
  assert.equal(result.discountAmount.toFixed(2), "150.00");
  assert.equal(result.taxAmount.toFixed(2), "148.50");
  assert.equal(result.totalAmount.toFixed(2), "1498.50");
  const fractional = calculateInvoice([{ description: "Fraction", quantity: decimal("0.05"), unitPrice: decimal("0.10") }], null, decimal(0));
  assert.equal(fractional.totalAmount.toFixed(2), "0.01");
});

test("Invalid precision, negative totals, and storage overflow cannot be persisted", () => {
  const input = { customerId: 1, dueDate: "2026-10-01", items: [{ description: "Item", quantity: 1, unitPrice: 0.001 }] };
  assert.equal(createInvoiceSchema.safeParse(input).success, false);
  assert.throws(() => calculateInvoice([{ description: "Item", quantity: decimal(1), unitPrice: decimal(10) }], { type: "fixed", value: decimal(11) }, decimal(0)), ApplicationError);
  assert.throws(() => calculateInvoice([{ description: "Item", quantity: decimal(2), unitPrice: decimal("9999999999.99") }], null, decimal(0)), ApplicationError);
});

test("Overdue derives from balance and UTC calendar days including drafts", () => {
  const invoice = { totalAmount: decimal("100.10"), payments: [{ amount: decimal("0.10") }], dueDate: asDate("2026-09-18"), status: "issued" as const };
  const now = new Date("2026-09-19T00:01:00Z");
  assert.equal(invoiceBalance(invoice, now).remainingBalance.toFixed(2), "100.00");
  assert.equal(invoiceBalance(invoice, now).daysOverdue, 1);
  assert.equal(invoiceBalance({ ...invoice, status: "draft" }, now).isOverdue, true);
  for (const status of ["cancelled", "void"] as const) assert.equal(invoiceBalance({ ...invoice, status }, now).isOverdue, false);
  assert.equal(invoiceBalance({ ...invoice, payments: [{ amount: decimal("100.10") }] }, now).isOverdue, false);
  assert.equal(invoiceBalance(invoice, new Date("2026-09-18T23:59:59Z")).isOverdue, false);
});

test("Input schemas enforce booleans, dates, unknown fields, PATCH fields, defaults, and int64 bounds", () => {
  assert.equal(createCustomerSchema.parse({ name: "Customer", email: "customer@example.com" }).type, "individual");
  assert.equal(updateCustomerSchema.safeParse({}).success, false);
  assert.equal(updateCustomerSchema.safeParse({ status: "archived" }).success, false);
  assert.equal(contractQuerySchema.parse({ archived: "false" }).archived, false);
  assert.equal(contractQuerySchema.safeParse({ archived: "yes" }).success, false);
  assert.equal(dateSchema.safeParse("2026-02-30").success, false);
  assert.equal(pathIdSchema.parse("9223372036854775807"), 9223372036854775807n);
  assert.equal(pathIdSchema.parse("001"), 1n);
  assert.equal(pathIdSchema.safeParse("9223372036854775808").success, false);
  assert.equal(idSchema.parse(parse("9223372036854775807")), 9223372036854775807n);
  assert.equal(reminderSettingsSchema.safeParse({ preDueEnabled: true, preDueDays: 7, dueDateEnabled: true, overdueEnabled: true, overdueDays: [3, 3] }).success, false);
});

test("JSON emits exact numeric BigInt and Decimal values and ISO dates", async () => {
  const response = json({ id: 9223372036854775807n, amount: new Prisma.Decimal("9999999999.99"), calculated: decimal("0.10"), date: new Date("2026-09-01T00:00:00Z") });
  const text = await response.text();
  assert.match(text, /"id":9223372036854775807/);
  assert.match(text, /"amount":9999999999\.99/);
  assert.match(text, /"calculated":0\.1/);
  assert.match(text, /2026-09-01T00:00:00.000Z/);
});

test("Unexpected errors do not expose database or credential details", async () => {
  const response = errorResponse(new Error("postgres password=secret SQL SELECT"));
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { status: 500, code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred." });
});

test("Email templates reject unsupported placeholders and render existing seed aliases", () => {
  validateTemplate({ subject: "Invoice {{invoiceNumber}}", body: "Hello {{customer_name}}" });
  assert.throws(() => validateTemplate({ subject: "{{passwordHash}}", body: "Text" }), ApplicationError);
  assert.equal(renderTemplate("{{customer_name}} / {{invoiceNumber}}", { customerName: "A", invoiceNumber: "INV-1" }), "A / INV-1");
});

test("JWT validation enforces signature, audience/issuer, and expiration", async () => {
  process.env.AUTH_JWT_SECRET = "unit-test-secret-with-at-least-thirty-two-bytes";
  const now = new Date("2026-09-19T12:00:00Z");
  const token = await accessToken(1n, 2n, now);
  assert.deepEqual(await verifyAccessToken(token, now), { administratorId: 1n, sessionId: 2n });
  await assert.rejects(verifyAccessToken(`${token.slice(0, -6)}broken`, now), ApplicationError);
  await assert.rejects(verifyAccessToken(token, new Date(now.getTime() + 900000)), (error: unknown) => error instanceof ApplicationError && error.code === "ACCESS_TOKEN_EXPIRED");
  assert.throws(() => validateSession(null, now), ApplicationError);
});
