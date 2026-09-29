import type { ISettingsRepository } from "@/types/repositories";
import type { Prisma, EmailTemplateType } from "@/app/generated/prisma/client";
import type { Database } from "./transaction";

export class PrismaSettingsRepository implements ISettingsRepository {
  constructor(private readonly resolveDatabase: () => Database) {}

  private get database(): Database { return this.resolveDatabase(); }

  business(businessId: bigint) { return this.database.business.findUnique({ where: { businessId } }); }

  updateBusiness(businessId: bigint, data: Prisma.BusinessUpdateInput) { return this.database.business.update({ where: { businessId }, data }); }

  get(businessId: bigint) { return this.database.systemSetting.findUnique({ where: { businessId } }); }

  ensure(businessId: bigint, currency: string) { return this.database.systemSetting.upsert({ where: { businessId }, update: {}, create: { businessId, currency, reminderOverdueDays: [3, 14, 30] } }); }

  update(businessId: bigint, data: Prisma.SystemSettingUpdateInput) { return this.database.systemSetting.update({ where: { businessId }, data }); }

  reserveNumber(businessId: bigint) { return this.database.systemSetting.update({ where: { businessId }, data: { invoiceNumberNextValue: { increment: 1 } } }); }

  templates(businessId: bigint) { return this.database.emailTemplate.findMany({ where: { businessId }, orderBy: { templateType: "asc" } }); }

  template(businessId: bigint, templateType: EmailTemplateType) { return this.database.emailTemplate.findUnique({ where: { businessId_templateType: { businessId, templateType } } }); }

  updateTemplate(businessId: bigint, templateType: EmailTemplateType, data: { subject: string; body: string }) { return this.database.emailTemplate.update({ where: { businessId_templateType: { businessId, templateType } }, data }); }
}
