import { services } from "@/services/container";
import { route } from "@/app/api/_lib/http";
import { paginationSchema } from "@/types/common";

export const runtime = "nodejs";

export const GET = route({ query: paginationSchema }, ({ actor, query }) => services.reports.customerBalances(actor, query));

