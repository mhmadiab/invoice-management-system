import { services } from "@/services/container";
import { route } from "@/app/api/_lib/http";
import { createCustomerSchema, customerQuerySchema } from "@/types/customers";

export const runtime = "nodejs";
/**  
 * It mainly connects HTTP concerns to your services: HTTP/authentication/validation  +  Business logic + Database access
 * tells route() to validate the URL query parameters.  
*/

/** create a customer */
export const POST = route({ body: createCustomerSchema, status: 201 }, ({ actor, body }) => services.customers.createCustomer(actor, body));

/** list customers */
export const GET = route({ query: customerQuerySchema }, ({ actor, query }) => services.customers.listCustomers(actor, query));

