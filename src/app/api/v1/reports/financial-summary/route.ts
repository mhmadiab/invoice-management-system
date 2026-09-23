import { route } from "@/app/api/_lib/http";
import { financialSummary } from "@/services/reports";
import { reportPeriodSchema } from "@/types/common";

export const runtime = "nodejs";

export const GET = route({ query: reportPeriodSchema }, ({ actor, query }) => financialSummary(actor, query));

