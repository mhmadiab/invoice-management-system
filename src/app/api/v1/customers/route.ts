import { route } from "@/app/api/_lib/http";
import { createCustomer, listCustomers } from "@/services/customers";
import { createCustomerSchema, customerQuerySchema } from "@/types/customers";

export const runtime = "nodejs";

export const POST = route({ body: createCustomerSchema, status: 201 }, ({ actor, body }) => createCustomer(actor, body));

export const GET = route({ query: customerQuerySchema }, ({ actor, query }) => listCustomers(actor, query));

