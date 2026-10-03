import { services } from "@/services/container";
import { route } from "@/app/api/_lib/http";
import { customerParamsSchema } from "@/types/common";

export const runtime = "nodejs";

/** unarchive a customer */
export const POST = route({ params: customerParamsSchema }, ({ actor, params }) => services.customers.setCustomerArchived(actor, params.customerId, false));

