import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import bcrypt from "bcryptjs";
import { getPrisma } from "@/prisma/client";
import { sendInvoice } from "@/services/deliveries";
import { processReminders } from "@/services/scheduler";
import { authenticate } from "@/services/auth";
import { dateOnly, DAY_MS } from "@/services/dates";
import { allOperations, assertResponse, routeFile } from "./contract-helper";

type Route = (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>;
type CallOptions = { params?: Record<string, string | number>; query?: Record<string, string | number>; body?: unknown; token?: string; cookie?: string; expected?: number };
const successes = new Set<string>();
const record = (value: unknown) => {
  assert.ok(value !== null && typeof value === "object" && !Array.isArray(value));
  return value as Record<string, unknown>;
};
const payload = (response: { body: Record<string, unknown> }) => record(response.body.data);
const identifier = (response: { body: Record<string, unknown> }) => String(payload(response).id);

async function call(method: string, pathname: string, options: CallOptions = {}) {
  const routeModule = await import(pathToFileURL(routeFile(pathname)).href) as Record<string, Route>;
  const params = Object.fromEntries(Object.entries(options.params ?? {}).map(([name, value]) => [name, String(value)]));
  const resolved = pathname.replace(/\{([^}]+)\}/g, (_match, name: string) => params[name]);
  const url = new URL(`http://localhost:3000/api/v1${resolved}`);
  for (const [key, value] of Object.entries(options.query ?? {})) url.searchParams.set(key, String(value));
  const headers = new Headers({ "Content-Type": "application/json" });
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);
  if (options.cookie) headers.set("Cookie", options.cookie);
  const request = new Request(url, { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  const response = await routeModule[method](request, { params: Promise.resolve(params) });
  const bytes = new Uint8Array(await response.arrayBuffer());
  const text = new TextDecoder().decode(bytes);
  const body = response.headers.get("Content-Type")?.includes("application/json") ? record(JSON.parse(text)) : {};
  if (options.expected !== undefined) assert.equal(response.status, options.expected, `${method} ${pathname}: ${text}`);
  assertResponse(pathname, method, response.status, body);
  if (response.status < 300) successes.add(`${method} ${pathname}`);
  return { status: response.status, body, headers: response.headers, text, bytes };
}

test("V1 API: PostgreSQL workflows, contract responses, isolation, and concurrency", { timeout: 120000 }, async t => {
  const url = process.env.DATABASE_URL;
  assert.ok(url && new URL(url).pathname === "/invoice_api_test", "Use only the separate invoice_api_test database.");
  process.env.AUTH_JWT_SECRET = "integration-test-secret-at-least-thirty-two-bytes";
  const database = getPrisma();
  const unique = randomUUID();
  const email = `admin-${unique}@example.com`;
  const password = "IntegrationPassword123!";
  const now = new Date();
  const today = dateOnly(now);
  const tomorrow = dateOnly(new Date(now.getTime() + DAY_MS));
  const yesterday = dateOnly(new Date(now.getTime() - DAY_MS));
  const future = dateOnly(new Date(now.getTime() + 365 * DAY_MS));
  const administrator = await database.administrator.create({ data: { email, passwordHash: await bcrypt.hash(password, 4), business: { create: { businessName: "API test business", email, currency: "USD", systemSettings: { create: { currency: "USD", invoiceNumberPrefix: "INV", reminderOverdueDays: [3, 14, 30] } }, emailTemplates: { create: ["invoice_delivery", "customer_reminder", "admin_notification"].map(templateType => ({ templateType: templateType as "invoice_delivery" | "customer_reminder" | "admin_notification", subject: "{{invoiceNumber}}", body: "Hello {{customerName}} {{remainingBalance}} {{contractTitle}}" })) } } } }, include: { business: true } });
  let token = "";
  let cookie = "";
  let customerId = "";
  let contractId = "";
  let invoiceId = "";
  const auth = () => ({ token });
  const customerParams = () => ({ customerId });
  const invoiceParams = () => ({ invoiceId });

  try {
    await t.test("Authentication, secure cookie, lockout, refresh, and request validation", async () => {
      await call("GET", "/customers", { expected: 401 });
      await call("POST", "/auth/login", { body: { email: "invalid", password }, expected: 400 });
      for (let attempt = 1; attempt <= 5; attempt++) await call("POST", "/auth/login", { body: { email, password: "wrong" }, expected: attempt === 5 ? 423 : 401 });
      await call("POST", "/auth/login", { body: { email, password }, expected: 423 });
      await database.administrator.update({ where: { administratorId: administrator.administratorId }, data: { lockedUntil: new Date(now.getTime() - 1), failedLoginAttempts: 5 } });
      const login = await call("POST", "/auth/login", { body: { email, password }, expected: 200 });
      token = String(login.body.accessToken);
      const setCookie = login.headers.get("Set-Cookie")!;
      assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /Secure/); assert.match(setCookie, /SameSite=Strict/); assert.match(setCookie, /Path=\/api\/v1\/auth/);
      cookie = setCookie.split(";")[0];
      assert.doesNotMatch(login.text, /passwordHash|refreshTokenHash/);
      await call("POST", "/auth/refresh", { cookie, expected: 200 });
      await call("POST", "/auth/refresh", { cookie: "invoice_refresh=invalid", expected: 401 });
      assert.equal((await database.administrator.findUniqueOrThrow({ where: { administratorId: administrator.administratorId } })).failedLoginAttempts, 0);
    });

    await t.test("Customer validation, default type, duplicates, search, and archives", async () => {
      const created = await call("POST", "/customers", { ...auth(), body: { name: "Customer Alpha", email: `customer-${unique}@example.com` }, expected: 201 });
      customerId = identifier(created); assert.equal(payload(created).type, "individual");
      await call("POST", "/customers", { ...auth(), body: { name: "Duplicate", email: `customer-${unique}@example.com` }, expected: 409 });
      await call("PATCH", "/customers/{customerId}", { ...auth(), params: customerParams(), body: { billingAddress: "Beirut", phone: null }, expected: 200 });
      await call("PATCH", "/customers/{customerId}", { ...auth(), params: customerParams(), body: {}, expected: 400 });
      await call("GET", "/customers/{customerId}", { ...auth(), params: customerParams(), expected: 200 });
      const list = await call("GET", "/customers", { ...auth(), query: { search: "ALPHA", status: "active" }, expected: 200 });
      assert.equal(record(list.body.pagination).totalItems, 1);
      await call("GET", "/customers", { ...auth(), query: { pageSize: 101 }, expected: 400 });
      await call("POST", "/customers/{customerId}/archive", { ...auth(), params: customerParams(), expected: 200 });
      await call("POST", "/customers/{customerId}/archive", { ...auth(), params: customerParams(), expected: 409 });
      await call("POST", "/customers/{customerId}/unarchive", { ...auth(), params: customerParams(), expected: 200 });
    });

    await t.test("Contracts preserve lifecycle status when archived and validate dates", async () => {
      const body = { customerId: Number(customerId), title: "Support", startDate: today, expirationDate: future, contractValue: 1000, billingFrequency: "monthly" };
      await call("POST", "/contracts", { ...auth(), body: { ...body, expirationDate: yesterday }, expected: 400 });
      contractId = identifier(await call("POST", "/contracts", { ...auth(), body, expected: 201 }));
      await call("GET", "/contracts", { ...auth(), query: { archived: "false" }, expected: 200 });
      await call("GET", "/contracts/{contractId}", { ...auth(), params: { contractId }, expected: 200 });
      await call("PATCH", "/contracts/{contractId}", { ...auth(), params: { contractId }, body: { title: "Support extended", contractValue: 1500 }, expected: 200 });
      const archived = await call("POST", "/contracts/{contractId}/archive", { ...auth(), params: { contractId }, expected: 200 });
      assert.equal(payload(archived).status, "draft"); assert.equal(payload(archived).isArchived, true);
      await call("GET", "/customers/{customerId}/contracts", { ...auth(), params: customerParams(), query: { archived: "true" }, expected: 200 });
      await call("POST", "/contracts/{contractId}/unarchive", { ...auth(), params: { contractId }, expected: 200 });
    });

    await t.test("Invoice calculation, draft history, derived overdue filtering, and edit locking", async () => {
      const body = { customerId: Number(customerId), contractId: Number(contractId), dueDate: yesterday, items: [{ description: "Services", quantity: 10, unitPrice: 100 }], discount: { type: "percentage", value: 10 }, taxRate: 11 };
      const invoice = await call("POST", "/invoices", { ...auth(), body, expected: 201 });
      invoiceId = identifier(invoice);
      assert.equal(payload(invoice).total, 999); assert.equal(payload(invoice).isOverdue, true);
      const history = await call("GET", "/customers/{customerId}/invoices", { ...auth(), params: customerParams(), expected: 200 });
      assert.equal(record((history.body.data as unknown[])[0]).invoiceNumber, null);
      await call("GET", "/invoices", { ...auth(), query: { overdue: "true", status: "draft", customerId }, expected: 200 });
      await call("GET", "/invoices/{invoiceId}", { ...auth(), params: invoiceParams(), expected: 200 });
      await call("PATCH", "/invoices/{invoiceId}", { ...auth(), params: invoiceParams(), body: { discount: null, taxRate: 0 }, expected: 200 });
      await call("GET", "/dashboard", { ...auth(), expected: 200 });
      await call("POST", "/invoices/{invoiceId}/issue", { ...auth(), params: invoiceParams(), expected: 200 });
      await call("POST", "/invoices/{invoiceId}/issue", { ...auth(), params: invoiceParams(), expected: 409 });
      await call("PATCH", "/invoices/{invoiceId}", { ...auth(), params: invoiceParams(), body: { dueDate: tomorrow }, expected: 422 });
      await call("POST", "/customers/{customerId}/archive", { ...auth(), params: customerParams(), expected: 409 });
      const pdf = await call("GET", "/invoices/{invoiceId}/pdf", { ...auth(), params: invoiceParams(), expected: 200 });
      assert.match(pdf.text.slice(0, 8), /%PDF/); assert.match(pdf.headers.get("Content-Disposition")!, /attachment/);
    });

    await t.test("Delivery failures are retained and successful delivery attaches a PDF", async () => {
      const actor = await authenticate(token);
      await assert.rejects(sendInvoice(actor, BigInt(invoiceId), { send: async () => { throw new Error("private provider secret"); }, pdf: async () => Buffer.from("%PDF-test") }));
      const sent = await sendInvoice(actor, BigInt(invoiceId), { send: async message => { assert.equal(message.to, `customer-${unique}@example.com`); assert.equal(message.attachments?.[0].contentType, "application/pdf"); }, pdf: async () => Buffer.from("%PDF-test") });
      assert.equal(sent.data.status, "sent");
      const deliveries = await call("GET", "/invoices/{invoiceId}/deliveries", { ...auth(), params: invoiceParams(), expected: 200 });
      assert.equal((deliveries.body.data as unknown[]).length, 2);
      assert.doesNotMatch(deliveries.text, /private provider secret/);
    });

    await t.test("Concurrent payments cannot overpay and paid invoices stop reminders", async () => {
      await database.reminder.create({ data: { invoiceId: BigInt(invoiceId), reminderType: "overdue", scheduledAt: new Date(now.getTime() + DAY_MS) } });
      const results = await Promise.all([1, 2].map(() => call("POST", "/invoices/{invoiceId}/payments", { ...auth(), params: invoiceParams(), body: { amount: 600, paymentDate: today, method: "bank_transfer" } })));
      assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
      const completed = await call("POST", "/invoices/{invoiceId}/payments", { ...auth(), params: invoiceParams(), body: { amount: 400, paymentDate: today, method: "cash" }, expected: 201 });
      assert.equal(record(completed.body.invoice).status, "paid"); assert.equal(record(completed.body.invoice).remainingBalance, 0);
      await call("POST", "/invoices/{invoiceId}/payments", { ...auth(), params: invoiceParams(), body: { amount: 1, paymentDate: today, method: "cash" }, expected: 409 });
      await call("POST", "/invoices/{invoiceId}/cancel", { ...auth(), params: invoiceParams(), expected: 409 });
      await call("POST", "/invoices/{invoiceId}/void", { ...auth(), params: invoiceParams(), expected: 409 });
      await call("GET", "/invoices/{invoiceId}/payments", { ...auth(), params: invoiceParams(), expected: 200 });
      await call("GET", "/payments", { ...auth(), query: { dateFrom: today, dateTo: today, customerId, method: "cash" }, expected: 200 });
      const reminders = await call("GET", "/invoices/{invoiceId}/reminders", { ...auth(), params: invoiceParams(), query: { status: "cancelled" }, expected: 200 });
      assert.equal(record(reminders.body.pagination).totalItems, 1);
    });

    await t.test("Concurrent issuance uses unique numbers, cancellation and void preserve records", async () => {
      const drafts = await Promise.all([1, 2, 3].map(() => call("POST", "/invoices", { ...auth(), body: { customerId: Number(customerId), dueDate: tomorrow, items: [{ description: "Additional service", quantity: 1, unitPrice: 50 }], taxRate: 0 }, expected: 201 })));
      const ids = drafts.map(identifier);
      const issued = await Promise.all(ids.slice(0, 2).map(id => call("POST", "/invoices/{invoiceId}/issue", { ...auth(), params: { invoiceId: id }, expected: 200 })));
      assert.equal(new Set(issued.map(result => payload(result).invoiceNumber)).size, 2);
      await call("POST", "/invoices/{invoiceId}/cancel", { ...auth(), params: { invoiceId: ids[0] }, expected: 200 });
      await call("POST", "/invoices/{invoiceId}/void", { ...auth(), params: { invoiceId: ids[2] }, expected: 200 });
      await call("POST", "/invoices/{invoiceId}/send", { ...auth(), params: { invoiceId: ids[2] }, expected: 409 });
      await call("GET", "/invoices/{invoiceId}", { ...auth(), params: { invoiceId: ids[2] }, expected: 200 });
    });

    await t.test("Settings, sequence protection, templates, notifications, and all reports", async () => {
      for (const setting of ["business", "invoice", "reminders", "notifications"]) await call("GET", `/settings/${setting}`, { ...auth(), expected: 200 });
      await call("PUT", "/settings/business", { ...auth(), body: { businessName: "Updated business", email, logoUrl: null }, expected: 200 });
      await call("PUT", "/settings/invoice", { ...auth(), body: { invoicePrefix: "INV", nextInvoiceNumber: 1, defaultTaxRate: 11 }, expected: 409 });
      await call("PUT", "/settings/invoice", { ...auth(), body: { invoicePrefix: "NEW", nextInvoiceNumber: 100, defaultTaxRate: 11 }, expected: 200 });
      await call("PUT", "/settings/reminders", { ...auth(), body: { preDueEnabled: true, preDueDays: 7, dueDateEnabled: true, overdueEnabled: true, overdueDays: [3, 14, 30] }, expected: 200 });
      await call("PUT", "/settings/notifications", { ...auth(), body: { overdueInvoiceEnabled: true, significantlyOverdueInvoiceEnabled: true, paymentReceivedEnabled: true, invoiceIssuedEnabled: true, contractExpiringSoonEnabled: true }, expected: 200 });
      await call("GET", "/settings/email-templates", { ...auth(), expected: 200 });
      await call("PUT", "/settings/email-templates/{templateType}", { ...auth(), params: { templateType: "customer_reminder" }, body: { subject: "Reminder {{invoiceNumber}}", body: "Hello {{customerName}}: {{remainingBalance}}" }, expected: 200 });
      await call("PUT", "/settings/email-templates/{templateType}", { ...auth(), params: { templateType: "customer_reminder" }, body: { subject: "{{passwordHash}}", body: "Hello" }, expected: 400 });
      const notifications = await call("GET", "/notifications", { ...auth(), query: { type: "payment_received", dateFrom: today, dateTo: today }, expected: 200 });
      const notification = record((notifications.body.data as unknown[])[0]);
      await call("GET", "/notifications/{notificationId}", { ...auth(), params: { notificationId: String(notification.id) }, expected: 200 });
      await call("GET", "/reports/financial-summary", { ...auth(), query: { dateFrom: yesterday, dateTo: tomorrow }, expected: 200 });
      await call("GET", "/reports/customer-balances", { ...auth(), expected: 200 });
      const report = await call("GET", "/reports/payments", { ...auth(), query: { dateFrom: today, dateTo: today, pageSize: 1 }, expected: 200 });
      assert.equal(payload(report).totalCollected, 1000); assert.equal((payload(report).payments as unknown[]).length, 1);
      await call("GET", "/reports/payments", { ...auth(), query: { dateFrom: tomorrow, dateTo: yesterday }, expected: 400 });
    });

    await t.test("Internal reminder processor avoids duplicate scheduled messages", async () => {
      const draft = await call("POST", "/invoices", { ...auth(), body: { customerId: Number(customerId), dueDate: today, items: [{ description: "Due today", quantity: 1, unitPrice: 25 }], taxRate: 0 }, expected: 201 });
      const id = identifier(draft);
      await call("POST", "/invoices/{invoiceId}/issue", { ...auth(), params: { invoiceId: id }, expected: 200 });
      let sent = 0;
      const send = async () => { sent++; };
      const first = await processReminders({ significantlyOverdueDays: 30, contractExpiringSoonDays: 30 }, new Date(), send);
      assert.ok(first && first.remindersSent >= 1);
      const afterFirst = sent;
      await processReminders({ significantlyOverdueDays: 30, contractExpiringSoonDays: 30 }, new Date(), send);
      assert.equal(sent, afterFirst);
    });

    await t.test("Business isolation, inactivity timeout, logout revocation", async () => {
      const outsider = await database.administrator.create({ data: { email: `other-${unique}@example.com`, passwordHash: await bcrypt.hash(password, 4), business: { create: { businessName: "Other", email: `other-${unique}@example.com`, currency: "USD" } } } });
      const otherLogin = await call("POST", "/auth/login", { body: { email: outsider.email, password }, expected: 200 });
      await call("GET", "/customers/{customerId}", { token: String(otherLogin.body.accessToken), params: customerParams(), expected: 404 });
      await call("GET", "/invoices/{invoiceId}", { token: String(otherLogin.body.accessToken), params: invoiceParams(), expected: 404 });
      await database.authSession.updateMany({ where: { administratorId: outsider.administratorId }, data: { lastActivityAt: new Date(Date.now() - 31 * 60000) } });
      await call("GET", "/customers", { token: String(otherLogin.body.accessToken), expected: 401 });
      const logout = await call("POST", "/auth/logout", { ...auth(), cookie, expected: 204 });
      assert.equal(logout.text, ""); assert.match(logout.headers.get("Set-Cookie")!, /Max-Age=0/);
      await call("POST", "/auth/refresh", { cookie, expected: 401 });
      await call("GET", "/customers", { ...auth(), expected: 401 });
    });

    // Sending requires SMTP. Its full business service is exercised above with a
    // controlled transport; all remaining operations have HTTP success coverage.
    const untested = allOperations().filter(item => !successes.has(`${item.method} ${item.pathname}`));
    assert.deepEqual(untested.map(item => item.definition.operationId), ["sendInvoice"]);
  } finally { await database.$disconnect(); }
});
