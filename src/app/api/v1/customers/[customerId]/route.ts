import { route } from "@/app/api/_lib/http";
import { getCustomer, updateCustomer } from "@/services/customers";
import { customerParamsSchema } from "@/types/common";
import { updateCustomerSchema } from "@/types/customers";

export const runtime = "nodejs";

export const GET = route({ params: customerParamsSchema }, ({ actor, params }) => getCustomer(actor, params.customerId));

export const PATCH = route({ params: customerParamsSchema, body: updateCustomerSchema }, ({ actor, params, body }) => updateCustomer(actor, params.customerId, body));

