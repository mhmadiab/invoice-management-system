import { route } from "@/app/api/_lib/http";
import { setCustomerArchived } from "@/services/customers";
import { customerParamsSchema } from "@/types/common";

export const runtime = "nodejs";

export const POST = route({ params: customerParamsSchema }, ({ actor, params }) => setCustomerArchived(actor, params.customerId, false));

