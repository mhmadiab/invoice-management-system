import type { DocumentInvoice } from "./repositories";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
}

export interface IEmailSender {
  send(message: EmailMessage): Promise<void>;
}

export interface IInvoicePdfRenderer {
  render(invoice: DocumentInvoice): Promise<Buffer>;
}
