import { getPrisma } from "@/prisma/client";
import { createRepositories } from "@/repository/context";
import { PrismaUnitOfWork } from "@/repository/transaction";
import { PostgresSchedulerLock } from "@/repository/scheduler";
import { AuthService } from "./auth";
import { CustomerService } from "./customers";
import { ContractService } from "./contracts";
import { InvoiceService } from "./invoices";
import { PaymentService } from "./payments";
import { SettingsService } from "./settings";
import { HistoryService } from "./history";
import { DeliveryService } from "./deliveries";
import { ReportService } from "./reports";
import { DashboardService } from "./dashboard";
import { SchedulerService } from "./scheduler";
import { InvoicePdfService, PdfKitInvoiceRenderer } from "./invoice-pdf";
import { SmtpEmailSender } from "./email";
import type { IEmailSender, IInvoicePdfRenderer } from "@/types/providers";

/** two repository usage patterns:
 normal operations : repository.auth --> getPrisma()
 Transactional operations: unitOfWokr.run() ==> Prisma.$Transaction 

 */

// This function builds all application services concrete adapters. Connections remain lazy.
export function createServices(providers: { email?: IEmailSender; pdf?: IInvoicePdfRenderer } = {}) {
  const repositories = createRepositories(getPrisma);//This creates the normal repository instances:
  const unitOfWork = new PrismaUnitOfWork();//This is the transaction manager
  const lock = new PostgresSchedulerLock();
  const email = providers.email ?? new SmtpEmailSender();
  const pdf = providers.pdf ?? new PdfKitInvoiceRenderer();
  return {
    auth: new AuthService(repositories.auth, unitOfWork),
    customers: new CustomerService(repositories.customers, unitOfWork),
    contracts: new ContractService(repositories.contracts, unitOfWork),
    invoices: new InvoiceService(repositories.invoices, unitOfWork),
    payments: new PaymentService(repositories.invoices, repositories.payments, unitOfWork),
    settings: new SettingsService(repositories.settings, unitOfWork),
    history: new HistoryService(repositories.notifications, unitOfWork),
    deliveries: new DeliveryService(repositories.deliveries, unitOfWork, email, pdf),
    reports: new ReportService(repositories.reports, unitOfWork),
    dashboard: new DashboardService(unitOfWork),
    scheduler: new SchedulerService(repositories.scheduler, unitOfWork, lock, email),
    invoicePdf: new InvoicePdfService(repositories.invoices, pdf),
  };
}

export const services = createServices();
//to be used in routes as services.auth, services.customers, ...
