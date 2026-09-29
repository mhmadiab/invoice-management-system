import { services } from "@/services/container";
import { route } from "@/app/api/_lib/http";
import { reportPeriodSchema } from "@/types/common";

export const runtime = "nodejs";

export const GET = route({ query: reportPeriodSchema }, ({ actor, query }) => services.reports.financialSummary(actor, query));

