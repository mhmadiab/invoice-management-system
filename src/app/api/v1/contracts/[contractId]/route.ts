import { route } from "@/app/api/_lib/http";
import { getContract, updateContract } from "@/services/contracts";
import { contractParamsSchema } from "@/types/common";
import { updateContractSchema } from "@/types/contracts";

export const runtime = "nodejs";

export const GET = route({ params: contractParamsSchema }, ({ actor, params }) => getContract(actor, params.contractId));

export const PATCH = route({ params: contractParamsSchema, body: updateContractSchema }, ({ actor, params, body }) => updateContract(actor, params.contractId, body));

