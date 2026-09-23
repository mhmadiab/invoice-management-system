import { route } from "@/app/api/_lib/http";
import { paymentReport } from "@/services/reports";
import { paymentReportQuerySchema } from "@/types/payments";

export const runtime = "nodejs";

export const GET = route({ query: paymentReportQuerySchema }, ({ actor, query }) => paymentReport(actor, query));

