import { route } from "@/app/api/_lib/http";
import { issueInvoice } from "@/services/invoices";
import { invoiceParamsSchema } from "@/types/common";

export const runtime = "nodejs";

export const POST = route({ params: invoiceParamsSchema }, ({ actor, params }) => issueInvoice(actor, params.invoiceId));

