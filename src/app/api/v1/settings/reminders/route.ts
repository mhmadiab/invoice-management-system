import { route } from "@/app/api/_lib/http";
import { getReminderSettings, updateReminderSettings } from "@/services/settings";
import { reminderSettingsSchema } from "@/types/settings";

export const runtime = "nodejs";

export const GET = route({  }, ({ actor }) => getReminderSettings(actor));

export const PUT = route({ body: reminderSettingsSchema }, ({ actor, body }) => updateReminderSettings(actor, body));

