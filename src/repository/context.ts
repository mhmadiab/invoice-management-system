import type { RepositoryContext } from "@/types/repositories";
import type { Database } from "./transaction";
import { PrismaAuthRepository } from "./auth";
import { PrismaCustomerRepository } from "./customers";
import { PrismaContractRepository } from "./contracts";
import { PrismaInvoiceRepository } from "./invoices";
import { PrismaPaymentRepository } from "./payments";
import { PrismaSettingsRepository } from "./settings";
import { PrismaNotificationRepository } from "./notifications";
import { PrismaReminderRepository } from "./reminders";
import { PrismaDeliveryRepository } from "./deliveries";
import { PrismaReportRepository } from "./reports";
import { PrismaSchedulerRepository } from "./scheduler";

export function createRepositories(resolveDatabase: () => Database): RepositoryContext {
  return {
    auth: new PrismaAuthRepository(resolveDatabase),
    customers: new PrismaCustomerRepository(resolveDatabase),
    contracts: new PrismaContractRepository(resolveDatabase),
    invoices: new PrismaInvoiceRepository(resolveDatabase),
    payments: new PrismaPaymentRepository(resolveDatabase),
    settings: new PrismaSettingsRepository(resolveDatabase),
    notifications: new PrismaNotificationRepository(resolveDatabase),
    reminders: new PrismaReminderRepository(resolveDatabase),
    deliveries: new PrismaDeliveryRepository(resolveDatabase),
    reports: new PrismaReportRepository(resolveDatabase),
    scheduler: new PrismaSchedulerRepository(resolveDatabase),
  };
}
