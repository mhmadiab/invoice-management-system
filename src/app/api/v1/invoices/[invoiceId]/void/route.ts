import { route } from "@/app/api/_lib/http";
import { voidInvoice } from "@/services/invoices";
import { invoiceParamsSchema } from "@/types/common";

export const runtime = "nodejs";

export const POST = route({ params: invoiceParamsSchema }, ({ actor, params }) => voidInvoice(actor, params.invoiceId));

