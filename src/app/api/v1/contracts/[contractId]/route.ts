import { services } from "@/services/container";
import { route } from "@/app/api/_lib/http";
import { contractParamsSchema } from "@/types/common";
import { updateContractSchema } from "@/types/contracts";

export const runtime = "nodejs";

export const GET = route({ params: contractParamsSchema }, ({ actor, params }) => services.contracts.getContract(actor, params.contractId));

export const PATCH = route({ params: contractParamsSchema, body: updateContractSchema }, ({ actor, params, body }) => services.contracts.updateContract(actor, params.contractId, body));

