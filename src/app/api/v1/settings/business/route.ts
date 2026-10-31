import { services } from "@/services/container";
import { route } from "@/app/api/_lib/http";
import { businessSettingsSchema } from "@/types/settings";

export const runtime = "nodejs";

export const GET = route({  }, ({ actor }) => services.settings.getBusinessSettings(actor));

export const PUT = route({ body: businessSettingsSchema }, ({ actor, body }) => services.settings.updateBusinessSettings(actor, body));

