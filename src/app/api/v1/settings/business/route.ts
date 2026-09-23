import { route } from "@/app/api/_lib/http";
import { getBusinessSettings, updateBusinessSettings } from "@/services/settings";
import { businessSettingsSchema } from "@/types/settings";

export const runtime = "nodejs";

export const GET = route({  }, ({ actor }) => getBusinessSettings(actor));

export const PUT = route({ body: businessSettingsSchema }, ({ actor, body }) => updateBusinessSettings(actor, body));

