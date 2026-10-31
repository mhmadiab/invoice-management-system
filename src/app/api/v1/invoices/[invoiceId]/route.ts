import { services } from "@/services/container";
import { route } from "@/app/api/_lib/http";
import { invoiceParamsSchema } from "@/types/common";
import { updateInvoiceSchema } from "@/types/invoices";

export const runtime = "nodejs";

export const GET = route({ params: invoiceParamsSchema }, ({ actor, params }) => services.invoices.getInvoice(actor, params.invoiceId));

export const PATCH = route({ params: invoiceParamsSchema, body: updateInvoiceSchema }, ({ actor, params, body }) => services.invoices.updateInvoice(actor, params.invoiceId, body));

