import { route } from "@/app/api/_lib/http";
import { setContractArchived } from "@/services/contracts";
import { contractParamsSchema } from "@/types/common";

export const runtime = "nodejs";

export const POST = route({ params: contractParamsSchema }, ({ actor, params }) => setContractArchived(actor, params.contractId, true));

