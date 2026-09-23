import { route } from "@/app/api/_lib/http";
import { invoiceDeliveries } from "@/services/deliveries";
import { invoiceParamsSchema } from "@/types/common";

export const runtime = "nodejs";

export const GET = route({ params: invoiceParamsSchema }, ({ actor, params }) => invoiceDeliveries(actor, params.invoiceId));

