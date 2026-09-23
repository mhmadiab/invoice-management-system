import { route } from "@/app/api/_lib/http";
import { listPayments } from "@/services/payments";
import { paymentQuerySchema } from "@/types/payments";

export const runtime = "nodejs";

export const GET = route({ query: paymentQuerySchema }, ({ actor, query }) => listPayments(actor, query));

