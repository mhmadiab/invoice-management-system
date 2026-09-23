import { route } from "@/app/api/_lib/http";
import { customerInvoices } from "@/services/invoices";
import { customerParamsSchema, paginationSchema } from "@/types/common";

export const runtime = "nodejs";

export const GET = route({ params: customerParamsSchema, query: paginationSchema }, ({ actor, params, query }) => customerInvoices(actor, params.customerId, query));

