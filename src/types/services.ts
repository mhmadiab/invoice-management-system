import type { Actor, Page } from "./context";
import type { CreateCustomerInput, CustomerQuery, UpdateCustomerInput } from "./customers";
import type { CreateInvoiceInput, InvoiceQuery, UpdateInvoiceInput } from "./invoices";
import type { CreatePaymentInput, PaymentQuery } from "./payments";
import type { customerDto } from "@/services/customers";
import type { invoiceDto, invoiceSummary, customerInvoiceSummary } from "@/services/invoice-mapping";
import type { paymentDto, paymentSummary } from "@/services/payments";
import type { pagination } from "@/services/pagination";

type Data<T> = { data: T };
type Paged<T> = Data<T[]> & { pagination: ReturnType<typeof pagination> };
type CustomerDto = ReturnType<typeof customerDto>;
type InvoiceDto = ReturnType<typeof invoiceDto>;
type PaymentDto = ReturnType<typeof paymentDto>;
type PaymentResult = { invoice: ReturnType<typeof paymentSummary> };

export interface ICustomerService {
  createCustomer(actor: Actor, input: CreateCustomerInput): Promise<Data<CustomerDto>>;
  listCustomers(actor: Actor, query: CustomerQuery): Promise<Paged<CustomerDto>>;
  getCustomer(actor: Actor, id: bigint): Promise<Data<CustomerDto>>;
  updateCustomer(actor: Actor, id: bigint, input: UpdateCustomerInput): Promise<Data<CustomerDto>>;
  setCustomerArchived(actor: Actor, id: bigint, archived: boolean): Promise<Data<CustomerDto>>;
}

export interface IInvoiceService {
  createInvoice(actor: Actor, input: CreateInvoiceInput): Promise<Data<InvoiceDto>>;
  getInvoice(actor: Actor, id: bigint): Promise<Data<InvoiceDto>>;
  listInvoices(actor: Actor, query: InvoiceQuery, now?: Date): Promise<Paged<ReturnType<typeof invoiceSummary>>>;
  customerInvoices(actor: Actor, customerId: bigint, page: Page): Promise<Paged<ReturnType<typeof customerInvoiceSummary>>>;
  updateInvoice(actor: Actor, id: bigint, input: UpdateInvoiceInput): Promise<Data<InvoiceDto>>;
  issueInvoice(actor: Actor, id: bigint, now?: Date): Promise<Data<InvoiceDto>>;
  cancelInvoice(actor: Actor, id: bigint): Promise<Data<InvoiceDto>>;
  voidInvoice(actor: Actor, id: bigint): Promise<Data<InvoiceDto>>;
}

export interface IPaymentService {
  createPayment(actor: Actor, invoiceId: bigint, input: CreatePaymentInput, now?: Date): Promise<Data<PaymentDto> & PaymentResult>;
  invoicePayments(actor: Actor, invoiceId: bigint, page: Page): Promise<Paged<PaymentDto> & PaymentResult>;
  listPayments(actor: Actor, query: PaymentQuery): Promise<Paged<PaymentDto>>;
}
