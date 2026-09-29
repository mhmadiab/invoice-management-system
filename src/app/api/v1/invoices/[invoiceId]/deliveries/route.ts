import { services } from "@/services/container";
import { route } from "@/app/api/_lib/http";
import { invoiceParamsSchema } from "@/types/common";

export const runtime = "nodejs";

export const GET = route({ params: invoiceParamsSchema }, ({ actor, params }) => services.deliveries.invoiceDeliveries(actor, params.invoiceId));

