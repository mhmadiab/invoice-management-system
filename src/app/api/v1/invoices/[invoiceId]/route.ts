import { route } from "@/app/api/_lib/http";
import { getInvoice, updateInvoice } from "@/services/invoices";
import { invoiceParamsSchema } from "@/types/common";
import { updateInvoiceSchema } from "@/types/invoices";

export const runtime = "nodejs";

export const GET = route({ params: invoiceParamsSchema }, ({ actor, params }) => getInvoice(actor, params.invoiceId));

export const PATCH = route({ params: invoiceParamsSchema, body: updateInvoiceSchema }, ({ actor, params, body }) => updateInvoice(actor, params.invoiceId, body));

