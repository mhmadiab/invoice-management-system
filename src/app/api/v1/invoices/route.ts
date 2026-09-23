import { route } from "@/app/api/_lib/http";
import { createInvoice, listInvoices } from "@/services/invoices";
import { createInvoiceSchema, invoiceQuerySchema } from "@/types/invoices";

export const runtime = "nodejs";

export const POST = route({ body: createInvoiceSchema, status: 201 }, ({ actor, body }) => createInvoice(actor, body));

export const GET = route({ query: invoiceQuerySchema }, ({ actor, query }) => listInvoices(actor, query));

