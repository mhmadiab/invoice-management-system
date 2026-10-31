import type { ISettingsRepository, IUnitOfWork } from "@/types/repositories";
import type { Business, EmailTemplate, EmailTemplateType, SystemSetting } from "@/app/generated/prisma/client";
import type { Actor } from "@/types/context";
import type { BusinessSettingsInput, EmailTemplateInput, InvoiceSettingsInput, NotificationSettingsInput, ReminderSettingsInput } from "@/types/settings";
import { conflict, required } from "@/types/errors";
import { ensureSettings, formatInvoiceNumber } from "./system-settings";
import { validateTemplate } from "./templates";

/**
 * businessDto(), invoiceSettingsDto(), reminderSettingsDto(), notificationSettingsDto(), templateDto()
 * selects the fields exposed by the API.
 */
export const businessDto = (business: Business) => ({ businessName: business.businessName, email: business.email, address: business.address, phone: business.phone, taxIdentifier: business.taxIdentifier, logoUrl: business.logoUrl });
export const invoiceSettingsDto = (settings: SystemSetting) => ({ invoicePrefix: settings.invoiceNumberPrefix, nextInvoiceNumber: settings.invoiceNumberNextValue, defaultTaxRate: settings.defaultTaxRate });
/**
 *  preDueEnabled:	Enables or disables reminders before an invoice's due date
    preDueDays:	Configures how many days before the due date the reminder should be sent
    dueDateEnabled:	Enables or disables a reminder on the due date
    overdueEnabled:	Enables or disables reminders after the due date
    overdueDays:	Configures the overdue reminder intervals
 */
export const reminderSettingsDto = (settings: SystemSetting) => ({ preDueEnabled: settings.reminderPreDueEnabled, preDueDays: settings.reminderPreDueDays, dueDateEnabled: settings.reminderDueDateEnabled, overdueEnabled: settings.reminderOverdueEnabled, overdueDays: [...new Set(overdueDays(settings.reminderOverdueDays))] });
/**
 *  overdueInvoiceEnabled:	An invoice becomes overdue
    significantlyOverdueInvoiceEnabled:	An invoice reaches a significant overdue threshold
    paymentReceivedEnabled:	A payment is received
    invoiceIssuedEnabled:	An invoice is issued
    contractExpiringSoonEnabled:	A contract is approaching expiration
 */
export const notificationSettingsDto = (settings: SystemSetting) => ({ overdueInvoiceEnabled: settings.adminNotificationOverdueEnabled, significantlyOverdueInvoiceEnabled: settings.adminNotificationSignificantlyOverdueEnabled, paymentReceivedEnabled: settings.adminNotificationPaymentReceivedEnabled, invoiceIssuedEnabled: settings.adminNotificationInvoiceIssuedEnabled, contractExpiringSoonEnabled: settings.adminNotificationContractExpiringSoonEnabled });
export const templateDto = (template: EmailTemplate) => ({ id: template.emailTemplateId, templateType: template.templateType, subject: template.subject, body: template.body });

export function overdueDays(value: SystemSetting["reminderOverdueDays"]): number[] {
  const days = Array.isArray(value) ? value : value && typeof value === "object" && "days" in value ? value.days : null;
  return Array.isArray(days) ? days.filter((day): day is number => typeof day === "number" && Number.isInteger(day) && day >= 1 && day <= 365) : [3, 14, 30];
}
export class SettingsService {
  constructor(
    private readonly settings: ISettingsRepository,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  /** get the business profile from authenticated actor  */
  async getBusinessSettings(actor: Actor) {
    return { data: businessDto(required(await this.settings.business(actor.businessId), "business")) };
  }

  /** update the business profile */
  async updateBusinessSettings(actor: Actor, input: BusinessSettingsInput) {
    return { data: businessDto(await this.settings.updateBusiness(actor.businessId, input)) };
  }

  /** get Invoice settings for authenticated actor */
  async getInvoiceSettings(actor: Actor) {
    return this.unitOfWork.run(async repositories => ({ data: invoiceSettingsDto(await ensureSettings(actor.businessId, repositories.settings)) }));
  }

  async updateInvoiceSettings(actor: Actor, input: InvoiceSettingsInput) {
    return this.unitOfWork.run(async repositories => {
      /**ensures that the business has a settings record */
      const current = await ensureSettings(actor.businessId, repositories.settings);
      /** retrieves existing invoice numbers so the service can check whether the proposed prefix and sequence would reuse an existing number */
      const numbers = await repositories.invoices.usedNumbers(actor.businessId);
      const prefix = input.invoicePrefix ? `${input.invoicePrefix}-` : "";
      /**
       * it rejects a sequence if:
        - The proposed next number already matches an existing formatted invoice number.
        - An existing invoice with the proposed prefix has a numeric suffix equal to or greater than the proposed next number.
       */
      const conflicts = numbers.some(({ invoiceNumber }) => {
        if (invoiceNumber === formatInvoiceNumber(input.invoicePrefix, input.nextInvoiceNumber)) return true;
        if (!invoiceNumber?.startsWith(prefix)) return false;
        const suffix = invoiceNumber.slice(prefix.length);
        return /^\d+$/.test(suffix) && BigInt(suffix) >= input.nextInvoiceNumber;
      });
      if (conflicts || (current.invoiceNumberPrefix === input.invoicePrefix && input.nextInvoiceNumber < current.invoiceNumberNextValue)) conflict("INVOICE_SEQUENCE_CONFLICT", "The specified invoice sequence would reuse an existing invoice number.");
      return { data: invoiceSettingsDto(await repositories.settings.update(actor.businessId, { invoiceNumberPrefix: input.invoicePrefix, invoiceNumberNextValue: input.nextInvoiceNumber, defaultTaxRate: input.defaultTaxRate })) };
    });
  }

  async getReminderSettings(actor: Actor) {
    return this.unitOfWork.run(async repositories => ({ data: reminderSettingsDto(await ensureSettings(actor.businessId, repositories.settings)) }));
  }

  async updateReminderSettings(actor: Actor, input: ReminderSettingsInput) {
    return this.unitOfWork.run(async repositories => {
      await ensureSettings(actor.businessId, repositories.settings);
      return { data: reminderSettingsDto(await repositories.settings.update(actor.businessId, { reminderPreDueEnabled: input.preDueEnabled, reminderPreDueDays: input.preDueDays, reminderDueDateEnabled: input.dueDateEnabled, reminderOverdueEnabled: input.overdueEnabled, reminderOverdueDays: input.overdueDays })) };
    });
  }

  async getNotificationSettings(actor: Actor) {
    return this.unitOfWork.run(async repositories => ({ data: notificationSettingsDto(await ensureSettings(actor.businessId, repositories.settings)) }));
  }

  async updateNotificationSettings(actor: Actor, input: NotificationSettingsInput) {
    return this.unitOfWork.run(async repositories => {
      await ensureSettings(actor.businessId, repositories.settings);
      return { data: notificationSettingsDto(await repositories.settings.update(actor.businessId, { adminNotificationOverdueEnabled: input.overdueInvoiceEnabled, adminNotificationSignificantlyOverdueEnabled: input.significantlyOverdueInvoiceEnabled, adminNotificationPaymentReceivedEnabled: input.paymentReceivedEnabled, adminNotificationInvoiceIssuedEnabled: input.invoiceIssuedEnabled, adminNotificationContractExpiringSoonEnabled: input.contractExpiringSoonEnabled })) };
    });
  }

  /** list all templates */
  async listEmailTemplates(actor: Actor) {
    return { data: (await this.settings.templates(actor.businessId)).map(templateDto) };
  }

  async updateEmailTemplate(actor: Actor, type: EmailTemplateType, input: EmailTemplateInput) {
    validateTemplate(input);
    return this.unitOfWork.run(async repositories => {
      const repository = repositories.settings;
      required(await repository.template(actor.businessId, type), "resource");
      return { data: templateDto(await repository.updateTemplate(actor.businessId, type, input)) };
    });
  }
}
