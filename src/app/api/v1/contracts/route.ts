import { services } from "@/services/container";
import { route } from "@/app/api/_lib/http";
import { contractQuerySchema, createContractSchema } from "@/types/contracts";

export const runtime = "nodejs";

export const POST = route({ body: createContractSchema, status: 201 }, ({ actor, body }) => services.contracts.createContract(actor, body));

export const GET = route({ query: contractQuerySchema }, ({ actor, query }) => services.contracts.listContracts(actor, query));

