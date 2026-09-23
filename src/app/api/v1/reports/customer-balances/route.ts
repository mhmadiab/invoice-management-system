import { route } from "@/app/api/_lib/http";
import { customerBalances } from "@/services/reports";
import { paginationSchema } from "@/types/common";

export const runtime = "nodejs";

export const GET = route({ query: paginationSchema }, ({ actor, query }) => customerBalances(actor, query));

