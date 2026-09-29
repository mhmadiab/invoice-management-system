import { services } from "@/services/container";
import { route } from "@/app/api/_lib/http";
import { notificationQuerySchema } from "@/types/history";

export const runtime = "nodejs";

export const GET = route({ query: notificationQuerySchema }, ({ actor, query }) => services.history.listNotifications(actor, query));

