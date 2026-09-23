import { route } from "@/app/api/_lib/http";
import { getNotification } from "@/services/history";
import { notificationParamsSchema } from "@/types/common";

export const runtime = "nodejs";

export const GET = route({ params: notificationParamsSchema }, ({ actor, params }) => getNotification(actor, params.notificationId));

