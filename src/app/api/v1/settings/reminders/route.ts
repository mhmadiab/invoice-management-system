import { services } from "@/services/container";
import { route } from "@/app/api/_lib/http";
import { reminderSettingsSchema } from "@/types/settings";

export const runtime = "nodejs";

export const GET = route({  }, ({ actor }) => services.settings.getReminderSettings(actor));

export const PUT = route({ body: reminderSettingsSchema }, ({ actor, body }) => services.settings.updateReminderSettings(actor, body));

