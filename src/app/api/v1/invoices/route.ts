import { services } from "@/services/container";
import { route } from "@/app/api/_lib/http";
import { createInvoiceSchema, invoiceQuerySchema } from "@/types/invoices";

export const runtime = "nodejs";

export const POST = route({ body: createInvoiceSchema, status: 201 }, ({ actor, body }) => services.invoices.createInvoice(actor, body));

export const GET = route({ query: invoiceQuerySchema }, ({ actor, query }) => services.invoices.listInvoices(actor, query));

