import type { ISettingsRepository } from "@/types/repositories";
import { required } from "@/types/errors";

export async function ensureSettings(businessId: bigint, repository: ISettingsRepository) {
  const current = await repository.get(businessId);
  if (current) return current;
  const business = required(await repository.business(businessId), "business");
  return repository.ensure(businessId, business.currency);
}

export const formatInvoiceNumber = (prefix: string | null, sequence: bigint) => prefix ? `${prefix}-${sequence}` : sequence.toString();
