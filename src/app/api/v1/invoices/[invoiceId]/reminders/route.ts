import { route } from "@/app/api/_lib/http";
import { invoiceReminders } from "@/services/history";
import { reminderQuerySchema } from "@/types/history";
import { invoiceParamsSchema } from "@/types/common";

export const runtime = "nodejs";

export const GET = route({ params: invoiceParamsSchema, query: reminderQuerySchema }, ({ actor, params, query }) => invoiceReminders(actor, params.invoiceId, query));

