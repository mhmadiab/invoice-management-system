import { services } from "@/services/container";
import { route } from "@/app/api/_lib/http";
import { reminderQuerySchema } from "@/types/history";
import { invoiceParamsSchema } from "@/types/common";

export const runtime = "nodejs";

export const GET = route({ params: invoiceParamsSchema, query: reminderQuerySchema }, ({ actor, params, query }) => services.history.invoiceReminders(actor, params.invoiceId, query));

