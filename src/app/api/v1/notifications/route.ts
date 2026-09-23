import { route } from "@/app/api/_lib/http";
import { listNotifications } from "@/services/history";
import { notificationQuerySchema } from "@/types/history";

export const runtime = "nodejs";

export const GET = route({ query: notificationQuerySchema }, ({ actor, query }) => listNotifications(actor, query));

