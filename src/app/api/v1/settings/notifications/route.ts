import { route } from "@/app/api/_lib/http";
import { getNotificationSettings, updateNotificationSettings } from "@/services/settings";
import { notificationSettingsSchema } from "@/types/settings";

export const runtime = "nodejs";

export const GET = route({  }, ({ actor }) => getNotificationSettings(actor));

export const PUT = route({ body: notificationSettingsSchema }, ({ actor, body }) => updateNotificationSettings(actor, body));

