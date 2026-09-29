import { services } from "@/services/container";
import { route } from "@/app/api/_lib/http";
import { contractParamsSchema } from "@/types/common";

export const runtime = "nodejs";

export const POST = route({ params: contractParamsSchema }, ({ actor, params }) => services.contracts.setContractArchived(actor, params.contractId, true));

