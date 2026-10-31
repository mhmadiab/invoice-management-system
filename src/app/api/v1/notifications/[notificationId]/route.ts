import { services } from "@/services/container";
import { route } from "@/app/api/_lib/http";
import { notificationParamsSchema } from "@/types/common";

export const runtime = "nodejs";

export const GET = route({ params: notificationParamsSchema }, ({ actor, params }) => services.history.getNotification(actor, params.notificationId));

