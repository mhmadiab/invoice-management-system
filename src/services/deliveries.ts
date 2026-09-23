import type { InvoiceDelivery } from "@/app/generated/prisma/client";
import { deliveryRepository } from "@/repository/deliveries";
import { invoiceRepository } from "@/repository/invoices";
import { settingsRepository } from "@/repository/settings";
import { transaction } from "@/repository/transaction";
import type { Actor } from "@/types/context";
import { conflict, required } from "@/types/errors";
import { invoiceBalance } from "./financial";
import { dateOnly } from "./dates";
import { renderInvoicePdf, pdfFilename } from "./invoice-pdf";
import { sendEmail } from "./email";
import { renderTemplate, validateTemplate } from "./templates";

export const deliveryDto = (delivery: InvoiceDelivery) => ({ id: delivery.deliveryId, invoiceId: delivery.invoiceId, recipientEmail: delivery.recipientEmail, status: delivery.status, sentAt: delivery.sentAt, failureReason: delivery.failureReason });
export async function invoiceDeliveries(actor: Actor, invoiceId: bigint) {
  return transaction(async database => {
    required(await invoiceRepository(database).get(actor.businessId, invoiceId), "invoice");
    return { data: (await deliveryRepository(database).list(actor.businessId, invoiceId)).map(deliveryDto) };
  });
}
export async function sendInvoice(actor: Actor, invoiceId: bigint, dependencies = { send: sendEmail, pdf: renderInvoicePdf }) {
  const { invoice, delivery, template } = await transaction(async database => {
    const invoice = required(await invoiceRepository(database).forDocument(actor.businessId, invoiceId), "invoice");
    if (invoice.status !== "issued") conflict("INVOICE_NOT_SENDABLE", "Only issued invoices can be sent.");
    const delivery = await deliveryRepository(database).create(invoiceId, invoice.customer.email);
    const template = await settingsRepository(database).template(actor.businessId, "invoice_delivery");
    return { invoice, delivery, template };
  });
  try {
    const configured = template ?? { subject: "Invoice {{invoiceNumber}}", body: "Hello {{customerName}}, please find your invoice attached. Remaining balance: {{remainingBalance}}." };
    validateTemplate(configured);
    const values = { businessName: invoice.business.businessName, customerName: invoice.customer.name, customerEmail: invoice.customer.email, invoiceNumber: invoice.invoiceNumber ?? "", issueDate: invoice.issueDate ? dateOnly(invoice.issueDate) : "", dueDate: dateOnly(invoice.dueDate), total: invoice.totalAmount.toFixed(2), paidAmount: invoiceBalance(invoice).paidAmount.toFixed(2), remainingBalance: invoiceBalance(invoice).remainingBalance.toFixed(2) };
    await dependencies.send({ to: invoice.customer.email, subject: renderTemplate(configured.subject, values).replace(/[\r\n]/g, " "), text: renderTemplate(configured.body, values), attachments: [{ filename: pdfFilename(invoice), content: await dependencies.pdf(invoice), contentType: "application/pdf" }] });
  } catch {
    await deliveryRepository().update(delivery.deliveryId, { status: "failed", failureReason: "Invoice email delivery failed.", sentAt: null });
    throw new Error("Invoice email delivery failed.");
  }
  return { data: deliveryDto(await deliveryRepository().update(delivery.deliveryId, { status: "sent", sentAt: new Date(), failureReason: null })) };
}
