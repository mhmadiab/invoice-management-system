import { services } from "@/services/container";
import { route } from "@/app/api/_lib/http";
import { customerParamsSchema, paginationSchema } from "@/types/common";

export const runtime = "nodejs";

export const GET = route({ params: customerParamsSchema, query: paginationSchema }, ({ actor, params, query }) => services.invoices.customerInvoices(actor, params.customerId, query));

