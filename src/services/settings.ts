import type { Business, EmailTemplate, EmailTemplateType, SystemSetting } from "@/app/generated/prisma/client";
import { settingsRepository } from "@/repository/settings";
import { invoiceRepository } from "@/repository/invoices";
import { transaction } from "@/repository/transaction";
import type { Actor } from "@/types/context";
import type { BusinessSettingsInput, EmailTemplateInput, InvoiceSettingsInput, NotificationSettingsInput, ReminderSettingsInput } from "@/types/settings";
import { conflict, required } from "@/types/errors";
import { ensureSettings, formatInvoiceNumber } from "./system-settings";
import { validateTemplate } from "./templates";

export const businessDto = (business: Business) => ({ businessName: business.businessName, email: business.email, address: business.address, phone: business.phone, taxIdentifier: business.taxIdentifier, logoUrl: business.logoUrl });
export const invoiceSettingsDto = (settings: SystemSetting) => ({ invoicePrefix: settings.invoiceNumberPrefix, nextInvoiceNumber: settings.invoiceNumberNextValue, defaultTaxRate: settings.defaultTaxRate });
export function overdueDays(value: SystemSetting["reminderOverdueDays"]): number[] {
  const days = Array.isArray(value) ? value : value && typeof value === "object" && "days" in value ? value.days : null;
  return Array.isArray(days) ? days.filter((day): day is number => typeof day === "number" && Number.isInteger(day) && day >= 1 && day <= 365) : [3, 14, 30];
}
export const reminderSettingsDto = (settings: SystemSetting) => ({ preDueEnabled: settings.reminderPreDueEnabled, preDueDays: settings.reminderPreDueDays, dueDateEnabled: settings.reminderDueDateEnabled, overdueEnabled: settings.reminderOverdueEnabled, overdueDays: [...new Set(overdueDays(settings.reminderOverdueDays))] });
export const notificationSettingsDto = (settings: SystemSetting) => ({ overdueInvoiceEnabled: settings.adminNotificationOverdueEnabled, significantlyOverdueInvoiceEnabled: settings.adminNotificationSignificantlyOverdueEnabled, paymentReceivedEnabled: settings.adminNotificationPaymentReceivedEnabled, invoiceIssuedEnabled: settings.adminNotificationInvoiceIssuedEnabled, contractExpiringSoonEnabled: settings.adminNotificationContractExpiringSoonEnabled });
export const templateDto = (template: EmailTemplate) => ({ id: template.emailTemplateId, templateType: template.templateType, subject: template.subject, body: template.body });

export async function getBusinessSettings(actor: Actor) {
  return { data: businessDto(required(await settingsRepository().business(actor.businessId), "business")) };
}
export async function updateBusinessSettings(actor: Actor, input: BusinessSettingsInput) {
  return { data: businessDto(await settingsRepository().updateBusiness(actor.businessId, input)) };
}
export async function getInvoiceSettings(actor: Actor) {
  return transaction(async database => ({ data: invoiceSettingsDto(await ensureSettings(actor.businessId, database)) }));
}
export async function updateInvoiceSettings(actor: Actor, input: InvoiceSettingsInput) {
  return transaction(async database => {
    const current = await ensureSettings(actor.businessId, database);
    const numbers = await invoiceRepository(database).usedNumbers(actor.businessId);
    const prefix = input.invoicePrefix ? `${input.invoicePrefix}-` : "";
    const conflicts = numbers.some(({ invoiceNumber }) => {
      if (invoiceNumber === formatInvoiceNumber(input.invoicePrefix, input.nextInvoiceNumber)) return true;
      if (!invoiceNumber?.startsWith(prefix)) return false;
      const suffix = invoiceNumber.slice(prefix.length);
      return /^\d+$/.test(suffix) && BigInt(suffix) >= input.nextInvoiceNumber;
    });
    if (conflicts || (current.invoiceNumberPrefix === input.invoicePrefix && input.nextInvoiceNumber < current.invoiceNumberNextValue)) conflict("INVOICE_SEQUENCE_CONFLICT", "The specified invoice sequence would reuse an existing invoice number.");
    return { data: invoiceSettingsDto(await settingsRepository(database).update(actor.businessId, { invoiceNumberPrefix: input.invoicePrefix, invoiceNumberNextValue: input.nextInvoiceNumber, defaultTaxRate: input.defaultTaxRate })) };
  });
}
export async function getReminderSettings(actor: Actor) {
  return transaction(async database => ({ data: reminderSettingsDto(await ensureSettings(actor.businessId, database)) }));
}
export async function updateReminderSettings(actor: Actor, input: ReminderSettingsInput) {
  return transaction(async database => {
    await ensureSettings(actor.businessId, database);
    return { data: reminderSettingsDto(await settingsRepository(database).update(actor.businessId, { reminderPreDueEnabled: input.preDueEnabled, reminderPreDueDays: input.preDueDays, reminderDueDateEnabled: input.dueDateEnabled, reminderOverdueEnabled: input.overdueEnabled, reminderOverdueDays: input.overdueDays })) };
  });
}
export async function getNotificationSettings(actor: Actor) {
  return transaction(async database => ({ data: notificationSettingsDto(await ensureSettings(actor.businessId, database)) }));
}
export async function updateNotificationSettings(actor: Actor, input: NotificationSettingsInput) {
  return transaction(async database => {
    await ensureSettings(actor.businessId, database);
    return { data: notificationSettingsDto(await settingsRepository(database).update(actor.businessId, { adminNotificationOverdueEnabled: input.overdueInvoiceEnabled, adminNotificationSignificantlyOverdueEnabled: input.significantlyOverdueInvoiceEnabled, adminNotificationPaymentReceivedEnabled: input.paymentReceivedEnabled, adminNotificationInvoiceIssuedEnabled: input.invoiceIssuedEnabled, adminNotificationContractExpiringSoonEnabled: input.contractExpiringSoonEnabled })) };
  });
}
export async function listEmailTemplates(actor: Actor) {
  return { data: (await settingsRepository().templates(actor.businessId)).map(templateDto) };
}
export async function updateEmailTemplate(actor: Actor, type: EmailTemplateType, input: EmailTemplateInput) {
  validateTemplate(input);
  return transaction(async database => {
    const repository = settingsRepository(database);
    required(await repository.template(actor.businessId, type), "resource");
    return { data: templateDto(await repository.updateTemplate(actor.businessId, type, input)) };
  });
}
