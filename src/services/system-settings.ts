import { settingsRepository } from "@/repository/settings";
import type { Database } from "@/repository/transaction";
import { required } from "@/types/errors";

export async function ensureSettings(businessId: bigint, database: Database) {
  const repository = settingsRepository(database);
  const current = await repository.get(businessId);
  if (current) return current;
  const business = required(await repository.business(businessId), "business");
  return repository.ensure(businessId, business.currency);
}

export const formatInvoiceNumber = (prefix: string | null, sequence: bigint) => prefix ? `${prefix}-${sequence}` : sequence.toString();
