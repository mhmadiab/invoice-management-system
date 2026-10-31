import { services } from "@/services/container";
import { route } from "@/app/api/_lib/http";
import { paymentReportQuerySchema } from "@/types/payments";

export const runtime = "nodejs";

export const GET = route({ query: paymentReportQuerySchema }, ({ actor, query }) => services.reports.paymentReport(actor, query));

