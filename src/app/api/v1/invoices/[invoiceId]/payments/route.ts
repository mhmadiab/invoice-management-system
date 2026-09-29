import { services } from "@/services/container";
import { route } from "@/app/api/_lib/http";
import { createPaymentSchema } from "@/types/payments";
import { invoiceParamsSchema, paginationSchema } from "@/types/common";

export const runtime = "nodejs";

export const POST = route({ params: invoiceParamsSchema, body: createPaymentSchema, status: 201 }, ({ actor, params, body }) => services.payments.createPayment(actor, params.invoiceId, body));

export const GET = route({ params: invoiceParamsSchema, query: paginationSchema }, ({ actor, params, query }) => services.payments.invoicePayments(actor, params.invoiceId, query));

