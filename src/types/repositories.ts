import type * as Models from "@/app/generated/prisma/client";
import type { Prisma, EmailTemplateType, NotificationType, ReminderType } from "@/app/generated/prisma/client";
import type { CustomerQuery } from "./customers";
import type { ContractQuery } from "./contracts";


/** this type is for combination the admin with its business */
export type AdministratorWithBusiness = Models.Administrator & { business: Models.Business | null };

/**this type combination for a authenticated session record and admin with business record  */
export type SessionRecord = Models.AuthSession & { administrator: AdministratorWithBusiness };
export type InvoiceRecord = Models.Invoice & { invoiceItems: Models.InvoiceItem[]; payments: Models.Payment[] };
export type DocumentInvoice = InvoiceRecord & { business: Models.Business; customer: Models.Customer };
export type ReportInvoice = Models.Invoice & { payments: Models.Payment[]; customer: Models.Customer };
export type ReportPayment = Models.Payment & { invoice: Models.Invoice & { customer: Models.Customer } };
export type SchedulerBusiness = Models.Business & { administrator: Models.Administrator; systemSettings: Models.SystemSetting | null; emailTemplates: Models.EmailTemplate[] };
export type PendingNotification = Models.AdministratorNotification & { invoice: ReportInvoice | null; payment: Models.Payment | null; contract: (Models.Contract & { customer: Models.Customer }) | null };

export interface IAuthRepository {
  administratorByEmail(email: string): Promise<AdministratorWithBusiness | null>;
  administratorById(administratorId: bigint): Promise<AdministratorWithBusiness | null>;
  updateAttempts(administratorId: bigint, failedLoginAttempts: number, lockedUntil: Date | null): Promise<Models.Administrator>;
  createSession(administratorId: bigint, refreshTokenHash: string, expiresAt: Date, now: Date): Promise<Models.AuthSession>;
  sessionByHash(refreshTokenHash: string): Promise<SessionRecord | null>;
  sessionById(sessionId: bigint): Promise<SessionRecord | null>;
  touchSession(sessionId: bigint, now: Date): Promise<Models.AuthSession>;
  revokeSession(sessionId: bigint, administratorId: bigint, now: Date): Promise<Prisma.BatchPayload>;
}

export interface ICustomerRepository {
  get(businessId: bigint, customerId: bigint): Promise<Models.Customer | null>;
  list(businessId: bigint, query: CustomerQuery): Promise<{ rows: Models.Customer[]; count: number }>;
  create(data: Prisma.CustomerUncheckedCreateInput): Promise<Models.Customer>;
  update(businessId: bigint, customerId: bigint, data: Prisma.CustomerUpdateInput): Promise<Models.Customer>;
  unpaidInvoices(businessId: bigint, customerId: bigint): Promise<{ totalAmount: Prisma.Decimal; payments: { amount: Prisma.Decimal }[] }[]>;
}

export interface IContractRepository {
  get(businessId: bigint, contractId: bigint): Promise<Models.Contract | null>;
  list(businessId: bigint, query: ContractQuery): Promise<{ rows: Models.Contract[]; count: number }>;
  create(data: Prisma.ContractUncheckedCreateInput): Promise<Models.Contract>;
  update(businessId: bigint, contractId: bigint, data: Prisma.ContractUpdateInput): Promise<Models.Contract>;
}

export interface IInvoiceRepository {
  get(businessId: bigint, invoiceId: bigint): Promise<InvoiceRecord | null>;
  list(businessId: bigint, filter?: Omit<Prisma.InvoiceWhereInput, "businessId">): Promise<InvoiceRecord[]>;
  create(data: Prisma.InvoiceUncheckedCreateInput): Promise<InvoiceRecord>;
  update(businessId: bigint, invoiceId: bigint, data: Prisma.InvoiceUpdateInput): Promise<InvoiceRecord>;
  cancelReminders(invoiceId: bigint): Promise<Prisma.BatchPayload>;
  usedNumbers(businessId: bigint): Promise<{ invoiceNumber: string | null }[]>;
  forDocument(businessId: bigint, invoiceId: bigint): Promise<DocumentInvoice | null>;
}

export interface IPaymentRepository {
  create(data: Prisma.PaymentUncheckedCreateInput): Promise<Models.Payment>;
  list(businessId: bigint, where: Omit<Prisma.PaymentWhereInput, "invoice">, customerId?: bigint): Promise<Models.Payment[]>;
}

export interface ISettingsRepository {
  business(businessId: bigint): Promise<Models.Business | null>;
  updateBusiness(businessId: bigint, data: Prisma.BusinessUpdateInput): Promise<Models.Business>;
  get(businessId: bigint): Promise<Models.SystemSetting | null>;
  ensure(businessId: bigint, currency: string): Promise<Models.SystemSetting>;
  update(businessId: bigint, data: Prisma.SystemSettingUpdateInput): Promise<Models.SystemSetting>;
  reserveNumber(businessId: bigint): Promise<Models.SystemSetting>;
  templates(businessId: bigint): Promise<Models.EmailTemplate[]>;
  template(businessId: bigint, templateType: EmailTemplateType): Promise<Models.EmailTemplate | null>;
  updateTemplate(businessId: bigint, templateType: EmailTemplateType, data: { subject: string; body: string }): Promise<Models.EmailTemplate>;
}

export interface INotificationRepository {
  create(data: Prisma.AdministratorNotificationUncheckedCreateInput): Promise<Models.AdministratorNotification>;
  get(administratorId: bigint, notificationId: bigint): Promise<Models.AdministratorNotification | null>;
  list(administratorId: bigint, filter: Omit<Prisma.AdministratorNotificationWhereInput, "administratorId">): Promise<Models.AdministratorNotification[]>;
}

export interface IReminderRepository {
  list(businessId: bigint, invoiceId: bigint, filter: Omit<Prisma.ReminderWhereInput, "invoice" | "invoiceId">): Promise<Models.Reminder[]>;
}

export interface IDeliveryRepository {
  create(invoiceId: bigint, recipientEmail: string): Promise<Models.InvoiceDelivery>;
  update(deliveryId: bigint, data: Prisma.InvoiceDeliveryUpdateInput): Promise<Models.InvoiceDelivery>;
  list(businessId: bigint, invoiceId: bigint): Promise<Models.InvoiceDelivery[]>;
}

export interface IReportRepository {
  invoices(businessId: bigint): Promise<ReportInvoice[]>;
  customers(businessId: bigint): Promise<Models.Customer[]>;
  payments(businessId: bigint, from?: Date, to?: Date): Promise<ReportPayment[]>;
  recentReminders(businessId: bigint): Promise<(Models.Reminder & { invoice: Models.Invoice })[]>;
}

export interface ISchedulerRepository {
  businesses(): Promise<SchedulerBusiness[]>;
  invoices(businessId: bigint): Promise<ReportInvoice[]>;
  contracts(businessId: bigint): Promise<(Models.Contract & { customer: Models.Customer })[]>;
  schedule(invoiceId: bigint, reminderType: ReminderType, scheduledAt: Date): Promise<Models.Reminder>;
  scheduled(businessId: bigint, now: Date): Promise<(Models.Reminder & { invoice: ReportInvoice })[]>;
  finishReminder(reminderId: bigint, status: "sent" | "failed" | "cancelled", now: Date): Promise<Models.Reminder>;
  notificationExists(administratorId: bigint, type: NotificationType, invoiceId?: bigint, contractId?: bigint): Promise<{ notificationId: bigint } | null>;
  createNotification(data: Prisma.AdministratorNotificationUncheckedCreateInput): Promise<Models.AdministratorNotification>;
  pendingNotifications(administratorId: bigint): Promise<PendingNotification[]>;
  finishNotification(notificationId: bigint, success: boolean, now: Date): Promise<Models.AdministratorNotification>;
}

// A context contains repositories bound to the same database transaction.
export interface RepositoryContext {
  readonly auth: IAuthRepository;
  readonly customers: ICustomerRepository;
  readonly contracts: IContractRepository;
  readonly invoices: IInvoiceRepository;
  readonly payments: IPaymentRepository;
  readonly settings: ISettingsRepository;
  readonly notifications: INotificationRepository;
  readonly reminders: IReminderRepository;
  readonly deliveries: IDeliveryRepository;
  readonly reports: IReportRepository;
  readonly scheduler: ISchedulerRepository;
}

//Execute a group of repository operations using the same transaction context.
export interface IUnitOfWork {
  run<T>(work: (repositories: RepositoryContext) => Promise<T>): Promise<T>;
}

export interface ISchedulerLock {
  run<T>(work: () => Promise<T>): Promise<T | null>;
}
