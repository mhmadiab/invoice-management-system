import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import config from "../config";

const prisma = new PrismaClient({
    adapter : new PrismaPg({
        connectionString: config.database.url || "postgresql://postgres:postgres@localhost:5432/invoice_management",
    }),
});

const money = (value: string) => new Decimal(value);
const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

async function main() {
  await prisma.$transaction([
    prisma.administratorNotification.deleteMany(),
    prisma.invoiceDelivery.deleteMany(),
    prisma.reminder.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.invoiceItem.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.contract.deleteMany(),
    prisma.emailTemplate.deleteMany(),
    prisma.systemSetting.deleteMany(),
    prisma.authSession.deleteMany(),
    prisma.business.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.administrator.deleteMany(),
  ]);

  const admin = await prisma.administrator.create({
    data: {
      email: "admin@acmestudio.dev",
      passwordHash: "hashed_password_123",
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  await prisma.authSession.create({
    data: {
      administratorId: admin.administratorId,
      refreshTokenHash: "refresh-token-hash-001",
      expiresAt: addDays(30),
      revokedAt: null,
    },
  });

  const business = await prisma.business.create({
    data: {
      administratorId: admin.administratorId,
      businessName: "Acme Studio",
      email: "hello@acmestudio.dev",
      phone: "+966500000000",
      address: "Riyadh, Saudi Arabia",
      taxIdentifier: "TAX-ACME-001",
      currency: "SAR",
      logoUrl: "https://example.com/logo.png",
    },
  });

  const customerA = await prisma.customer.create({
    data: {
      businessId: business.businessId,
      name: "Noura Al-Hassan",
      email: "noura@northstar.sa",
      phone: "+966500000001",
      address: "Jeddah, Saudi Arabia",
      customerType: "individual",
      status: "active",
    },
  });

  const customerB = await prisma.customer.create({
    data: {
      businessId: business.businessId,
      name: "BluePeak Technologies",
      email: "billing@bluepeak.io",
      phone: "+966500000002",
      address: "Dammam, Saudi Arabia",
      customerType: "organization",
      status: "active",
    },
  });

  const contractA = await prisma.contract.create({
    data: {
      businessId: business.businessId,
      customerId: customerA.customerId,
      contractNumber: "CTR-2025-001",
      title: "Brand Website Redesign",
      description: "Full landing page and online presence redesign project.",
      startDate: new Date("2025-01-01T00:00:00.000Z"),
      endDate: new Date("2025-12-31T00:00:00.000Z"),
      status: "active",
      contractValue: money("12000.00"),
      billingFrequency: "monthly",
      isArchived: false,
    },
  });

  const contractB = await prisma.contract.create({
    data: {
      businessId: business.businessId,
      customerId: customerB.customerId,
      contractNumber: "CTR-2025-002",
      title: "ERP UI Consulting",
      description: "Consulting and implementation of enterprise interface modules.",
      startDate: new Date("2025-02-15T00:00:00.000Z"),
      endDate: new Date("2025-11-30T00:00:00.000Z"),
      status: "pending_approval",
      contractValue: money("25000.00"),
      billingFrequency: "monthly",
      isArchived: false,
    },
  });

  const invoiceA = await prisma.invoice.create({
    data: {
      businessId: business.businessId,
      customerId: customerA.customerId,
      contractId: contractA.contractId,
      invoiceNumber: "INV-2025-001",
      issueDate: new Date("2025-03-01T00:00:00.000Z"),
      dueDate: new Date("2025-03-15T00:00:00.000Z"),
      status: "issued",
      subtotal: money("1500.00"),
      discountType: "percentage",
      discountValue: money("10.00"),
      discountAmount: money("150.00"),
      taxRate: money("15.00"),
      taxAmount: money("202.50"),
      totalAmount: money("1552.50"),
    },
  });

  const invoiceB = await prisma.invoice.create({
    data: {
      businessId: business.businessId,
      customerId: customerB.customerId,
      contractId: contractB.contractId,
      invoiceNumber: "INV-2025-002",
      issueDate: new Date("2025-04-01T00:00:00.000Z"),
      dueDate: new Date("2025-04-20T00:00:00.000Z"),
      status: "paid",
      subtotal: money("3200.00"),
      discountType: "fixed",
      discountValue: money("200.00"),
      discountAmount: money("200.00"),
      taxRate: money("15.00"),
      taxAmount: money("465.00"),
      totalAmount: money("3465.00"),
    },
  });

  await prisma.invoiceItem.createMany({
    data: [
      {
        invoiceId: invoiceA.invoiceId,
        description: "Homepage redesign",
        quantity: money("1.00"),
        unitPrice: money("800.00"),
        lineTotal: money("800.00"),
      },
      {
        invoiceId: invoiceA.invoiceId,
        description: "Landing page optimization",
        quantity: money("2.00"),
        unitPrice: money("350.00"),
        lineTotal: money("700.00"),
      },
      {
        invoiceId: invoiceB.invoiceId,
        description: "ERP dashboard UI audit",
        quantity: money("1.00"),
        unitPrice: money("1500.00"),
        lineTotal: money("1500.00"),
      },
      {
        invoiceId: invoiceB.invoiceId,
        description: "Implementation support",
        quantity: money("8.00"),
        unitPrice: money("212.50"),
        lineTotal: money("1700.00"),
      },
    ],
  });

  await prisma.payment.createMany({
    data: [
      {
        invoiceId: invoiceA.invoiceId,
        paymentDate: new Date("2025-03-12T00:00:00.000Z"),
        amount: money("800.00"),
        paymentMethod: "bank_transfer",
      },
      {
        invoiceId: invoiceB.invoiceId,
        paymentDate: new Date("2025-04-18T00:00:00.000Z"),
        amount: money("3465.00"),
        paymentMethod: "card",
      },
    ],
  });

  await prisma.reminder.createMany({
    data: [
      {
        invoiceId: invoiceA.invoiceId,
        scheduledAt: new Date("2025-03-10T09:00:00.000Z"),
        sentAt: new Date("2025-03-10T09:15:00.000Z"),
        status: "sent",
        reminderType: "pre_due",
      },
      {
        invoiceId: invoiceA.invoiceId,
        scheduledAt: new Date("2025-03-15T09:00:00.000Z"),
        sentAt: new Date("2025-03-15T09:20:00.000Z"),
        status: "sent",
        reminderType: "due_date",
      },
      {
        invoiceId: invoiceB.invoiceId,
        scheduledAt: new Date("2025-04-18T09:00:00.000Z"),
        sentAt: new Date("2025-04-18T09:10:00.000Z"),
        status: "sent",
        reminderType: "due_date",
      },
    ],
  });

  await prisma.invoiceDelivery.createMany({
    data: [
      {
        invoiceId: invoiceA.invoiceId,
        recipientEmail: "noura@northstar.sa",
        sentAt: new Date("2025-03-01T12:00:00.000Z"),
        status: "sent",
        failureReason: null,
      },
      {
        invoiceId: invoiceB.invoiceId,
        recipientEmail: "billing@bluepeak.io",
        sentAt: new Date("2025-04-01T12:00:00.000Z"),
        status: "sent",
        failureReason: null,
      },
    ],
  });

  await prisma.systemSetting.create({
    data: {
      businessId: business.businessId,
      invoiceNumberPrefix: "INV",
      invoiceNumberNextValue: 2026n,
      currency: "SAR",
      defaultTaxRate: money("15.00"),
      reminderPreDueEnabled: true,
      reminderPreDueDays: 3,
      reminderDueDateEnabled: true,
      reminderOverdueEnabled: true,
      reminderOverdueDays: { days: [3, 7, 14] },
      adminNotificationOverdueEnabled: true,
      adminNotificationSignificantlyOverdueEnabled: true,
      adminNotificationPaymentReceivedEnabled: true,
      adminNotificationInvoiceIssuedEnabled: true,
      adminNotificationContractExpiringSoonEnabled: true,
    },
  });

  await prisma.emailTemplate.createMany({
    data: [
      {
        businessId: business.businessId,
        templateType: "invoice_delivery",
        subject: "Your invoice from Acme Studio",
        body: "Hello {{customer_name}},\n\nYour invoice {{invoice_number}} is attached. Thank you for your business.",
      },
      {
        businessId: business.businessId,
        templateType: "customer_reminder",
        subject: "Payment reminder for invoice {{invoice_number}}",
        body: "This is a friendly reminder that your payment for {{invoice_number}} is due soon.",
      },
      {
        businessId: business.businessId,
        templateType: "admin_notification",
        subject: "Payment received for invoice {{invoice_number}}",
        body: "A payment has been received and posted to the invoice ledger.",
      },
    ],
  });

  await prisma.administratorNotification.createMany({
    data: [
      {
        administratorId: admin.administratorId,
        invoiceId: invoiceA.invoiceId,
        paymentId: null,
        contractId: null,
        type: "invoice_issued",
        sentAt: new Date("2025-03-01T12:05:00.000Z"),
        status: "sent",
        failureReason: null,
      },
      {
        administratorId: admin.administratorId,
        invoiceId: invoiceB.invoiceId,
        paymentId: null,
        contractId: null,
        type: "payment_received",
        sentAt: new Date("2025-04-18T09:20:00.000Z"),
        status: "sent",
        failureReason: null,
      },
      {
        administratorId: admin.administratorId,
        invoiceId: null,
        paymentId: null,
        contractId: contractB.contractId,
        type: "contract_expiring_soon",
        sentAt: new Date("2025-05-15T10:00:00.000Z"),
        status: "pending",
        failureReason: null,
      },
    ],
  });

  console.log("Seed data created successfully.");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
