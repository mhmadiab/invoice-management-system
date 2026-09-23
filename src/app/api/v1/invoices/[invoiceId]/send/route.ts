import { route } from "@/app/api/_lib/http";
import { sendInvoice } from "@/services/deliveries";
import { invoiceParamsSchema } from "@/types/common";

export const runtime = "nodejs";

export const POST = route({ params: invoiceParamsSchema }, ({ actor, params }) => sendInvoice(actor, params.invoiceId));

