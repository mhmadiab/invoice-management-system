import { services } from "@/services/container";
import { route } from "@/app/api/_lib/http";
import { paymentQuerySchema } from "@/types/payments";

export const runtime = "nodejs";

export const GET = route({ query: paymentQuerySchema }, ({ actor, query }) => services.payments.listPayments(actor, query));

