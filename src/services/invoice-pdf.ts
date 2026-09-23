import PDFDocument from "pdfkit";
import { invoiceRepository } from "@/repository/invoices";
import type { Actor } from "@/types/context";
import { required } from "@/types/errors";
import { dateOnly } from "./dates";
import { invoiceBalance } from "./financial";
import { readLogo } from "./pdf-assets";

export type DocumentInvoice = NonNullable<Awaited<ReturnType<ReturnType<typeof invoiceRepository>["forDocument"]>>>;
export const pdfFilename = (invoice: DocumentInvoice) => `${(invoice.invoiceNumber ?? `draft-${invoice.invoiceId}`).replace(/[^A-Za-z0-9._-]/g, "_")}.pdf`;

export async function renderInvoicePdf(invoice: DocumentInvoice): Promise<Buffer> {
  const logo = await readLogo(invoice.business.logoUrl);
  const document = new PDFDocument({ size: "A4", margin: 48, info: { Title: invoice.invoiceNumber ?? "Draft invoice" } });
  const chunks: Buffer[] = [];
  const result = new Promise<Buffer>((resolve, reject) => {
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
  });
  if (process.env.PDF_FONT_PATH) document.font(process.env.PDF_FONT_PATH);
  document.fontSize(20).text(invoice.business.businessName);
  document.fontSize(10).text([invoice.business.email, invoice.business.phone, invoice.business.address, invoice.business.taxIdentifier].filter(Boolean).join("\n"));
  if (logo) document.image(logo, 440, 48, { fit: [100, 60] });
  document.moveDown().fontSize(16).text(invoice.invoiceNumber ?? "Draft invoice");
  document.fontSize(10).text(`Status: ${invoice.status}`);
  document.text(`Issued: ${invoice.issueDate ? dateOnly(invoice.issueDate) : "Draft"}    Due: ${dateOnly(invoice.dueDate)}`);
  document.moveDown().text(`Bill to: ${invoice.customer.name}`);
  document.text([invoice.customer.email, invoice.customer.phone, invoice.customer.address].filter(Boolean).join("\n"));
  document.moveDown().fontSize(12).text("Invoice items");
  for (const item of invoice.invoiceItems) {
    document.moveDown(0.5).fontSize(10).text(item.description);
    document.text(`${item.quantity.toFixed(2)} x ${item.unitPrice.toFixed(2)} = ${item.lineTotal.toFixed(2)} ${invoice.business.currency}`);
  }
  const balance = invoiceBalance(invoice);
  document.moveDown().text(`Subtotal: ${invoice.subtotal.toFixed(2)}`);
  document.text(`Discount: ${invoice.discountAmount.toFixed(2)}`);
  document.text(`Tax (${invoice.taxRate.toFixed(2)}%): ${invoice.taxAmount.toFixed(2)}`);
  document.fontSize(12).text(`Total: ${invoice.totalAmount.toFixed(2)} ${invoice.business.currency}`);
  document.fontSize(10).text(`Paid: ${balance.paidAmount.toFixed(2)}`);
  document.text(`Remaining balance: ${balance.remainingBalance.toFixed(2)} ${invoice.business.currency}`);
  document.end();
  return result;
}
export async function invoicePdf(actor: Actor, invoiceId: bigint) {
  const invoice = required(await invoiceRepository().forDocument(actor.businessId, invoiceId), "invoice");
  return { bytes: await renderInvoicePdf(invoice), filename: pdfFilename(invoice) };
}
