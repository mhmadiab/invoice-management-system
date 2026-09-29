import { services } from "@/services/container";
import { route } from "@/app/api/_lib/http";
import { notificationSettingsSchema } from "@/types/settings";

export const runtime = "nodejs";

export const GET = route({  }, ({ actor }) => services.settings.getNotificationSettings(actor));

export const PUT = route({ body: notificationSettingsSchema }, ({ actor, body }) => services.settings.updateNotificationSettings(actor, body));

