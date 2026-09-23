import { route } from "@/app/api/_lib/http";
import { listContracts } from "@/services/contracts";
import { customerContractQuerySchema } from "@/types/contracts";
import { customerParamsSchema } from "@/types/common";

export const runtime = "nodejs";

export const GET = route({ params: customerParamsSchema, query: customerContractQuerySchema }, ({ actor, params, query }) => listContracts(actor, query, params.customerId));

