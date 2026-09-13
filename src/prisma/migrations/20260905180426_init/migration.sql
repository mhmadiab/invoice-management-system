-- CreateEnum
CREATE TYPE "customer_type" AS ENUM ('individual', 'organization');

-- CreateEnum
CREATE TYPE "customer_status" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "contract_status" AS ENUM ('draft', 'pending_approval', 'active', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "invoice_status" AS ENUM ('draft', 'issued', 'partially_paid', 'paid', 'cancelled', 'void');

-- CreateEnum
CREATE TYPE "discount_type" AS ENUM ('percentage', 'fixed');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('cash', 'bank_transfer', 'card', 'cheque');

-- CreateEnum
CREATE TYPE "reminder_status" AS ENUM ('scheduled', 'sent', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "reminder_type" AS ENUM ('pre_due', 'due_date', 'overdue');

-- CreateEnum
CREATE TYPE "delivery_status" AS ENUM ('pending', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "notification_status" AS ENUM ('pending', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('invoice_issued', 'invoice_overdue', 'invoice_significantly_overdue', 'payment_received', 'contract_expiring_soon');

-- CreateEnum
CREATE TYPE "email_template_type" AS ENUM ('invoice_delivery', 'customer_reminder', 'admin_notification');

-- CreateTable
CREATE TABLE "administrators" (
    "administrator_id" BIGSERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "administrators_pkey" PRIMARY KEY ("administrator_id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "session_id" BIGSERIAL NOT NULL,
    "administrator_id" BIGINT NOT NULL,
    "refresh_token_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "business_id" BIGSERIAL NOT NULL,
    "administrator_id" BIGINT NOT NULL,
    "business_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "address" TEXT,
    "tax_identifier" VARCHAR(100),
    "currency" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "logo_url" VARCHAR(500),

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("business_id")
);

-- CreateTable
CREATE TABLE "customers" (
    "customer_id" BIGSERIAL NOT NULL,
    "business_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "address" TEXT,
    "customer_type" "customer_type" NOT NULL,
    "status" "customer_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("customer_id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "contract_id" BIGSERIAL NOT NULL,
    "business_id" BIGINT NOT NULL,
    "customer_id" BIGINT NOT NULL,
    "contract_number" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "contract_status" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "contract_value" DECIMAL(12,2) NOT NULL,
    "billing_frequency" VARCHAR(50) NOT NULL,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("contract_id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "invoice_id" BIGSERIAL NOT NULL,
    "business_id" BIGINT NOT NULL,
    "customer_id" BIGINT NOT NULL,
    "contract_id" BIGINT,
    "invoice_number" VARCHAR(100),
    "issue_date" DATE,
    "due_date" DATE NOT NULL,
    "status" "invoice_status" NOT NULL DEFAULT 'draft',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount_type" "discount_type",
    "discount_value" DECIMAL(12,2),
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("invoice_id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "invoice_item_id" BIGSERIAL NOT NULL,
    "invoice_id" BIGINT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "line_total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("invoice_item_id")
);

-- CreateTable
CREATE TABLE "payments" (
    "payment_id" BIGSERIAL NOT NULL,
    "invoice_id" BIGINT NOT NULL,
    "payment_date" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_method" "payment_method" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "reminder_id" BIGSERIAL NOT NULL,
    "invoice_id" BIGINT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "status" "reminder_status" NOT NULL DEFAULT 'scheduled',
    "reminder_type" "reminder_type" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("reminder_id")
);

-- CreateTable
CREATE TABLE "invoice_deliveries" (
    "delivery_id" BIGSERIAL NOT NULL,
    "invoice_id" BIGINT NOT NULL,
    "recipient_email" VARCHAR(255) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "status" "delivery_status" NOT NULL,
    "failure_reason" TEXT,

    CONSTRAINT "invoice_deliveries_pkey" PRIMARY KEY ("delivery_id")
);

-- CreateTable
CREATE TABLE "administrator_notifications" (
    "notification_id" BIGSERIAL NOT NULL,
    "administrator_id" BIGINT NOT NULL,
    "invoice_id" BIGINT,
    "payment_id" BIGINT,
    "contract_id" BIGINT,
    "type" "notification_type" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "status" "notification_status" NOT NULL DEFAULT 'pending',
    "failure_reason" TEXT,

    CONSTRAINT "administrator_notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "settings_id" BIGSERIAL NOT NULL,
    "business_id" BIGINT NOT NULL,
    "invoice_number_prefix" VARCHAR(50),
    "invoice_number_next_value" BIGINT NOT NULL DEFAULT 1,
    "currency" VARCHAR(10) NOT NULL,
    "default_tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "reminder_pre_due_enabled" BOOLEAN NOT NULL DEFAULT true,
    "reminder_pre_due_days" INTEGER DEFAULT 7,
    "reminder_due_date_enabled" BOOLEAN NOT NULL DEFAULT true,
    "reminder_overdue_enabled" BOOLEAN NOT NULL DEFAULT true,
    "reminder_overdue_days" JSONB,
    "admin_notification_overdue_enabled" BOOLEAN NOT NULL DEFAULT true,
    "admin_notification_significantly_overdue_enabled" BOOLEAN NOT NULL DEFAULT true,
    "admin_notification_payment_received_enabled" BOOLEAN NOT NULL DEFAULT true,
    "admin_notification_invoice_issued_enabled" BOOLEAN NOT NULL DEFAULT true,
    "admin_notification_contract_expiring_soon_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("settings_id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "email_template_id" BIGSERIAL NOT NULL,
    "business_id" BIGINT NOT NULL,
    "template_type" "email_template_type" NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("email_template_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "administrators_email_key" ON "administrators"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_refresh_token_hash_key" ON "auth_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "auth_sessions_administrator_id_idx" ON "auth_sessions"("administrator_id");

-- CreateIndex
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "auth_sessions_revoked_at_idx" ON "auth_sessions"("revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_administrator_id_key" ON "businesses"("administrator_id");

-- CreateIndex
CREATE INDEX "customers_business_id_idx" ON "customers"("business_id");

-- CreateIndex
CREATE INDEX "customers_business_id_name_idx" ON "customers"("business_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "customers_business_id_email_key" ON "customers"("business_id", "email");

-- CreateIndex
CREATE INDEX "contracts_business_id_idx" ON "contracts"("business_id");

-- CreateIndex
CREATE INDEX "contracts_customer_id_idx" ON "contracts"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_business_id_contract_number_key" ON "contracts"("business_id", "contract_number");

-- CreateIndex
CREATE INDEX "invoices_business_id_idx" ON "invoices"("business_id");

-- CreateIndex
CREATE INDEX "invoices_customer_id_idx" ON "invoices"("customer_id");

-- CreateIndex
CREATE INDEX "invoices_contract_id_idx" ON "invoices"("contract_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_due_date_idx" ON "invoices"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_business_id_invoice_number_key" ON "invoices"("business_id", "invoice_number");

-- CreateIndex
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_payment_date_idx" ON "payments"("payment_date");

-- CreateIndex
CREATE INDEX "reminders_invoice_id_idx" ON "reminders"("invoice_id");

-- CreateIndex
CREATE INDEX "reminders_scheduled_at_idx" ON "reminders"("scheduled_at");

-- CreateIndex
CREATE INDEX "reminders_status_idx" ON "reminders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "reminders_invoice_id_reminder_type_scheduled_at_key" ON "reminders"("invoice_id", "reminder_type", "scheduled_at");

-- CreateIndex
CREATE INDEX "invoice_deliveries_invoice_id_idx" ON "invoice_deliveries"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_deliveries_sent_at_idx" ON "invoice_deliveries"("sent_at");

-- CreateIndex
CREATE INDEX "invoice_deliveries_status_idx" ON "invoice_deliveries"("status");

-- CreateIndex
CREATE INDEX "administrator_notifications_administrator_id_idx" ON "administrator_notifications"("administrator_id");

-- CreateIndex
CREATE INDEX "administrator_notifications_invoice_id_idx" ON "administrator_notifications"("invoice_id");

-- CreateIndex
CREATE INDEX "administrator_notifications_payment_id_idx" ON "administrator_notifications"("payment_id");

-- CreateIndex
CREATE INDEX "administrator_notifications_type_idx" ON "administrator_notifications"("type");

-- CreateIndex
CREATE INDEX "administrator_notifications_created_at_idx" ON "administrator_notifications"("created_at");

-- CreateIndex
CREATE INDEX "administrator_notifications_status_idx" ON "administrator_notifications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_business_id_key" ON "system_settings"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_business_id_template_type_key" ON "email_templates"("business_id", "template_type");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_administrator_id_fkey" FOREIGN KEY ("administrator_id") REFERENCES "administrators"("administrator_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_administrator_id_fkey" FOREIGN KEY ("administrator_id") REFERENCES "administrators"("administrator_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("business_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("business_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("business_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("contract_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("invoice_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("invoice_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("invoice_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_deliveries" ADD CONSTRAINT "invoice_deliveries_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("invoice_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "administrator_notifications" ADD CONSTRAINT "administrator_notifications_administrator_id_fkey" FOREIGN KEY ("administrator_id") REFERENCES "administrators"("administrator_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "administrator_notifications" ADD CONSTRAINT "administrator_notifications_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("invoice_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "administrator_notifications" ADD CONSTRAINT "administrator_notifications_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("payment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "administrator_notifications" ADD CONSTRAINT "administrator_notifications_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("contract_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("business_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("business_id") ON DELETE RESTRICT ON UPDATE CASCADE;
