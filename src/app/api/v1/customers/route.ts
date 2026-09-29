import { services } from "@/services/container";
import { route } from "@/app/api/_lib/http";
import { createCustomerSchema, customerQuerySchema } from "@/types/customers";

export const runtime = "nodejs";

export const POST = route({ body: createCustomerSchema, status: 201 }, ({ actor, body }) => services.customers.createCustomer(actor, body));

export const GET = route({ query: customerQuerySchema }, ({ actor, query }) => services.customers.listCustomers(actor, query));

