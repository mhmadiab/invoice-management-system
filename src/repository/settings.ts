import type { Prisma, EmailTemplateType } from "@/app/generated/prisma/client";
import { getPrisma } from "@/prisma/client";
import type { Database } from "./transaction";

export function settingsRepository(database: Database = getPrisma()) {
  return {
    business: (businessId: bigint) => database.business.findUnique({ where: { businessId } }),
    updateBusiness: (businessId: bigint, data: Prisma.BusinessUpdateInput) => database.business.update({ where: { businessId }, data }),
    get: (businessId: bigint) => database.systemSetting.findUnique({ where: { businessId } }),
    ensure: (businessId: bigint, currency: string) => database.systemSetting.upsert({ where: { businessId }, update: {}, create: { businessId, currency, reminderOverdueDays: [3, 14, 30] } }),
    update: (businessId: bigint, data: Prisma.SystemSettingUpdateInput) => database.systemSetting.update({ where: { businessId }, data }),
    reserveNumber: (businessId: bigint) => database.systemSetting.update({ where: { businessId }, data: { invoiceNumberNextValue: { increment: 1 } } }),
    templates: (businessId: bigint) => database.emailTemplate.findMany({ where: { businessId }, orderBy: { templateType: "asc" } }),
    template: (businessId: bigint, templateType: EmailTemplateType) => database.emailTemplate.findUnique({ where: { businessId_templateType: { businessId, templateType } } }),
    updateTemplate: (businessId: bigint, templateType: EmailTemplateType, data: { subject: string; body: string }) => database.emailTemplate.update({ where: { businessId_templateType: { businessId, templateType } }, data }),
  };
}
