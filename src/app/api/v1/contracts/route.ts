import { route } from "@/app/api/_lib/http";
import { createContract, listContracts } from "@/services/contracts";
import { contractQuerySchema, createContractSchema } from "@/types/contracts";

export const runtime = "nodejs";

export const POST = route({ body: createContractSchema, status: 201 }, ({ actor, body }) => createContract(actor, body));

export const GET = route({ query: contractQuerySchema }, ({ actor, query }) => listContracts(actor, query));

