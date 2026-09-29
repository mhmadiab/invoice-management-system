import nodemailer from "nodemailer";
import type { EmailMessage, IEmailSender } from "@/types/providers";

export type { EmailMessage } from "@/types/providers";

export class SmtpEmailSender implements IEmailSender {
  private transport: ReturnType<typeof nodemailer.createTransport> | undefined;

  async send(message: EmailMessage): Promise<void> {
    const host = process.env.SMTP_HOST;
    const from = process.env.SMTP_FROM;
    if (!host || !from) throw new Error("SMTP_HOST and SMTP_FROM are required.");
    this.transport ??= nodemailer.createTransport({
      host, port: Number(process.env.SMTP_PORT ?? 587), secure: process.env.SMTP_SECURE === "true", requireTLS: process.env.SMTP_SECURE !== "true",
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
      disableFileAccess: true, disableUrlAccess: true,
    });
    const result = await this.transport.sendMail({ from, ...message });
    if (!result.accepted.length || result.rejected.length) throw new Error("Email was not accepted.");
  }
}
