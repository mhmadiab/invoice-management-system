import type { IInvoiceRepository, IUnitOfWork } from "@/types/repositories";
import type { IInvoiceService } from "@/types/services";
import type { Actor, Page } from "@/types/context";
import type { CreateInvoiceInput, InvoiceQuery, UpdateInvoiceInput } from "@/types/invoices";
import { ApplicationError, conflict, invalid, required } from "@/types/errors";
import { calculateInvoice, invoiceBalance } from "./financial";
import { asDate, today } from "./dates";
import { invoiceDto, invoiceSummary, customerInvoiceSummary } from "./invoice-mapping";
import { paginate } from "./pagination";
import { ensureSettings, formatInvoiceNumber } from "./system-settings";

export class InvoiceService implements IInvoiceService {
  constructor(
    private readonly invoices: IInvoiceRepository,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async createInvoice(actor: Actor, input: CreateInvoiceInput) {
    return this.unitOfWork.run(async repositories => {
      //customer validation
      const customer = required(await repositories.customers.get(actor.businessId, input.customerId), "customer");
      if (customer.status === "archived") invalid("customerId", "Select an active customer.");
      //validate contract
      if (input.contractId != null) {
        const contract = required(await repositories.contracts.get(actor.businessId, input.contractId), "contract");
        if (contract.customerId !== input.customerId) conflict("CONTRACT_CUSTOMER_MISMATCH", "The selected contract does not belong to the selected customer.");
        if (contract.isArchived) invalid("contractId", "Select an unarchived contract.");
      }
      //get settings to use default tax rate if tax rate isn't provided 
      const settings = await ensureSettings(actor.businessId, repositories.settings);
      //financial calculations
      const { invoiceItems, ...amounts } = calculateInvoice(input.items, input.discount, input.taxRate ?? settings.defaultTaxRate);
      //creating invoice + invoiceItems in one prisma operation 
      const invoice = await repositories.invoices.create({ businessId: actor.businessId, customerId: input.customerId, contractId: input.contractId, dueDate: asDate(input.dueDate), ...amounts, invoiceItems: { create: invoiceItems } });
      return { data: invoiceDto(invoice) };
    });
  }

  //readOnly function that gets the invoices including invoices items and payments based on invoiceID 
  async getInvoice(actor: Actor, id: bigint) {
    return { data: invoiceDto(required(await this.invoices.get(actor.businessId, id), "invoice")) };
  }

  //It converts API filters into repository filters
  async listInvoices(actor: Actor, query: InvoiceQuery, now = new Date()) {
    const invoices = await this.invoices.list(actor.businessId, {
      customerId: query.customerId, status: query.status,
      ...(query.invoiceNumber ? { invoiceNumber: { contains: query.invoiceNumber, mode: "insensitive" } } : {}),
      ...(query.issueDateFrom || query.issueDateTo ? { issueDate: { gte: query.issueDateFrom ? asDate(query.issueDateFrom) : undefined, lte: query.issueDateTo ? asDate(query.issueDateTo) : undefined } } : {}),
    });
    const rows = invoices.map(invoice => invoiceSummary(invoice, now)).filter(invoice => query.overdue === undefined || invoice.isOverdue === query.overdue);
    return paginate(rows, query);
  }

  //Give me invoices belonging to one customer
  async customerInvoices(actor: Actor, customerId: bigint, page: Page) {
    return this.unitOfWork.run(async repositories => {
      //validate customer exists 
      required(await repositories.customers.get(actor.businessId, customerId), "customer");
      //get the related invoices + paginate
      const invoices = await repositories.invoices.list(actor.businessId, { customerId });
      return paginate(invoices.map(invoice => customerInvoiceSummary(invoice)), page);
    });
  }

  async updateInvoice(actor: Actor, id: bigint, input: UpdateInvoiceInput) {
    return this.unitOfWork.run(async repositories => {
      const repository = repositories.invoices;
      const invoice = required(await repository.get(actor.businessId, id), "invoice");
      if (invoice.status !== "draft") throw new ApplicationError("unprocessable", "INVOICE_NOT_EDITABLE", "Only draft invoices can be modified.");
      const discount = input.discount === undefined ? (invoice.discountType && invoice.discountValue !== null ? { type: invoice.discountType, value: invoice.discountValue } : null) : input.discount;
      const { invoiceItems, ...amounts } = calculateInvoice(input.items ?? invoice.invoiceItems, discount, input.taxRate ?? invoice.taxRate);
      const result = await repository.update(actor.businessId, id, {
        ...amounts, dueDate: input.dueDate ? asDate(input.dueDate) : undefined,
        ...(input.items ? { invoiceItems: { deleteMany: {}, create: invoiceItems } } : {}),
      });
      return { data: invoiceDto(result) };
    });
  }

  //change draft into issued
  async issueInvoice(actor: Actor, id: bigint, now = new Date()) {
    return this.unitOfWork.run(async repositories => {
      const repository = repositories.invoices;
      const invoice = required(await repository.get(actor.businessId, id), "invoice");
      //validate if it's draft
      if (invoice.status !== "draft") conflict("INVOICE_NOT_DRAFT", "Only draft invoices can be issued.");
      //check invoice items exists 
      if (!invoice.invoiceItems.length) conflict("INVOICE_NOT_DRAFT", "Invoice must contain at least one valid line item.");
      const currentSettings = await ensureSettings(actor.businessId, repositories.settings);
      //check sequence number 
      if (currentSettings.invoiceNumberNextValue >= 9223372036854775807n) conflict("INVOICE_SEQUENCE_EXHAUSTED", "The invoice number sequence is exhausted.");
      //validates every invoice item
      if (invoice.invoiceItems.some(item => !item.description.trim() || item.quantity.lte(0) || item.unitPrice.lt(0))) conflict("INVOICE_NOT_ISSUABLE", "Invoice must contain valid line items.");
      //recalculate the invoice to apply the discount
      const discount = invoice.discountType && invoice.discountValue !== null ? { type: invoice.discountType, value: invoice.discountValue } : null;
      let finalized: ReturnType<typeof calculateInvoice>;
      try { finalized = calculateInvoice(invoice.invoiceItems, discount, invoice.taxRate); }
      catch (error) {
        if (error instanceof ApplicationError) conflict("INVOICE_NOT_ISSUABLE", "Invoice financial values are invalid.");
        throw error;
      }
      //Reserve the invoice number
      const settings = await repositories.settings.reserveNumber(actor.businessId);
      const invoiceNumber = formatInvoiceNumber(settings.invoiceNumberPrefix, settings.invoiceNumberNextValue - 1n);
      if ((await repository.usedNumbers(actor.businessId)).some(value => value.invoiceNumber === invoiceNumber)) conflict("INVOICE_SEQUENCE_CONFLICT", "The specified invoice sequence would reuse an existing invoice number.");
      const { invoiceItems, ...amounts } = finalized;
      //Update invoice to issued
      const result = await repository.update(actor.businessId, id, {
        ...amounts, invoiceNumber, issueDate: today(now), status: "issued",
        invoiceItems: { update: invoiceItems.map((item, index) => ({ where: { invoiceItemId: invoice.invoiceItems[index].invoiceItemId }, data: { lineTotal: item.lineTotal } })) },
      });
      //Invoice issued notification
      if (settings.adminNotificationInvoiceIssuedEnabled) await repositories.notifications.create({ administratorId: actor.administratorId, invoiceId: id, type: "invoice_issued", createdAt: now });
      return { data: invoiceDto(result, now) };
    });
  }

  async cancelInvoice(actor: Actor, id: bigint) {
    return this.unitOfWork.run(async repositories => {
      const repository = repositories.invoices;
      //get the invoice
      const invoice = required(await repository.get(actor.businessId, id), "invoice");
      //check if its already cancelled, paid 
      if (invoice.status === "cancelled") conflict("INVOICE_ALREADY_CANCELLED", "Invoice is already cancelled.");
      if (invoice.status === "paid" || invoiceBalance(invoice).remainingBalance.lte(0)) conflict("PAID_INVOICE_CANNOT_BE_CANCELLED", "A fully paid invoice cannot be cancelled.");
      //Only issued or partially paid can be cancelled
      if (invoice.status !== "issued" && invoice.status !== "partially_paid") conflict("INVOICE_NOT_CANCELLABLE", "Only issued, unpaid invoices can be cancelled.");
      //cancele reminders, because after cancellation the invoice should no longer generate payment reminders.
      await repository.cancelReminders(id);
      //update and return 
      return { data: invoiceDto(await repository.update(actor.businessId, id, { status: "cancelled" })) };
    });
  }

  async voidInvoice(actor: Actor, id: bigint) {
    return this.unitOfWork.run(async repositories => {
      const repository = repositories.invoices;
      const invoice = required(await repository.get(actor.businessId, id), "invoice");
      if (invoice.status === "void") conflict("INVOICE_ALREADY_VOID", "Invoice is already void.");
      if (invoice.payments.length) conflict("INVOICE_WITH_PAYMENTS_CANNOT_BE_VOIDED", "An invoice with recorded payments cannot be voided.");
      if (invoice.status !== "draft" && invoice.status !== "issued") conflict("INVOICE_NOT_VOIDABLE", "Invoice cannot be voided in its current state.");
      await repository.cancelReminders(id);
      return { data: invoiceDto(await repository.update(actor.businessId, id, { status: "void" })) };
    });
  }
}
