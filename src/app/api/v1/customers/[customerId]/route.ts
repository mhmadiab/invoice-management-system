import { services } from "@/services/container";
import { route } from "@/app/api/_lib/http";
import { customerParamsSchema } from "@/types/common";
import { updateCustomerSchema } from "@/types/customers";

export const runtime = "nodejs";

export const GET = route({ params: customerParamsSchema }, ({ actor, params }) => services.customers.getCustomer(actor, params.customerId));

export const PATCH = route({ params: customerParamsSchema, body: updateCustomerSchema }, ({ actor, params, body }) => services.customers.updateCustomer(actor, params.customerId, body));

