import type { IDeliveryRepository, IUnitOfWork } from "@/types/repositories";
import type { InvoiceDelivery } from "@/app/generated/prisma/client";
import type { Actor } from "@/types/context";
import { conflict, required } from "@/types/errors";
import { invoiceBalance } from "./financial";
import { dateOnly } from "./dates";
import { pdfFilename } from "./invoice-pdf";
import type { IEmailSender, IInvoicePdfRenderer } from "@/types/providers";
import { renderTemplate, validateTemplate } from "./templates";

export const deliveryDto = (delivery: InvoiceDelivery) => ({ id: delivery.deliveryId, invoiceId: delivery.invoiceId, recipientEmail: delivery.recipientEmail, status: delivery.status, sentAt: delivery.sentAt, failureReason: delivery.failureReason });

export class DeliveryService {
  constructor(
    private readonly deliveries: IDeliveryRepository,
    private readonly unitOfWork: IUnitOfWork,
    private readonly email: IEmailSender,
    private readonly pdf: IInvoicePdfRenderer,
  ) {}

  async invoiceDeliveries(actor: Actor, invoiceId: bigint) {
    return this.unitOfWork.run(async repositories => {
      required(await repositories.invoices.get(actor.businessId, invoiceId), "invoice");
      return { data: (await repositories.deliveries.list(actor.businessId, invoiceId)).map(deliveryDto) };
    });
  }

  async sendInvoice(actor: Actor, invoiceId: bigint) {
    const { invoice, delivery, template } = await this.unitOfWork.run(async repositories => {
      const invoice = required(await repositories.invoices.forDocument(actor.businessId, invoiceId), "invoice");
      if (invoice.status !== "issued") conflict("INVOICE_NOT_SENDABLE", "Only issued invoices can be sent.");
      const delivery = await repositories.deliveries.create(invoiceId, invoice.customer.email);
      const template = await repositories.settings.template(actor.businessId, "invoice_delivery");
      return { invoice, delivery, template };
    });
    try {
      const configured = template ?? { subject: "Invoice {{invoiceNumber}}", body: "Hello {{customerName}}, please find your invoice attached. Remaining balance: {{remainingBalance}}." };
      validateTemplate(configured);
      const values = { businessName: invoice.business.businessName, customerName: invoice.customer.name, customerEmail: invoice.customer.email, invoiceNumber: invoice.invoiceNumber ?? "", issueDate: invoice.issueDate ? dateOnly(invoice.issueDate) : "", dueDate: dateOnly(invoice.dueDate), total: invoice.totalAmount.toFixed(2), paidAmount: invoiceBalance(invoice).paidAmount.toFixed(2), remainingBalance: invoiceBalance(invoice).remainingBalance.toFixed(2) };
      await this.email.send({ to: invoice.customer.email, subject: renderTemplate(configured.subject, values).replace(/[\r\n]/g, " "), text: renderTemplate(configured.body, values), attachments: [{ filename: pdfFilename(invoice), content: await this.pdf.render(invoice), contentType: "application/pdf" }] });
    } catch {
      await this.deliveries.update(delivery.deliveryId, { status: "failed", failureReason: "Invoice email delivery failed.", sentAt: null });
      throw new Error("Invoice email delivery failed.");
    }
    return { data: deliveryDto(await this.deliveries.update(delivery.deliveryId, { status: "sent", sentAt: new Date(), failureReason: null })) };
  }
}
