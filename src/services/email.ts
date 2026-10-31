import nodemailer from "nodemailer";
import type { EmailMessage, IEmailSender } from "@/types/providers";
import config from "@/config";

export type { EmailMessage } from "@/types/providers";

export class SmtpEmailSender implements IEmailSender {
  private transport: ReturnType<typeof nodemailer.createTransport> | undefined;

  async send(message: EmailMessage): Promise<void> {
    const { host, from } = config.smtp;
    if (!host || !from) throw new Error("SMTP_HOST and SMTP_FROM are required.");
    this.transport ??= nodemailer.createTransport({
      host, port: config.smtp.port, secure: config.smtp.secure, requireTLS: !config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.password } : undefined,
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
      disableFileAccess: true, disableUrlAccess: true,
    });
    const result = await this.transport.sendMail({ from, ...message });
    if (!result.accepted.length || result.rejected.length) throw new Error("Email was not accepted.");
  }
}
