import { services } from "@/services/container";
import { route } from "@/app/api/_lib/http";
import { invoiceParamsSchema } from "@/types/common";

export const runtime = "nodejs";

export const POST = route({ params: invoiceParamsSchema }, ({ actor, params }) => services.invoices.voidInvoice(actor, params.invoiceId));

