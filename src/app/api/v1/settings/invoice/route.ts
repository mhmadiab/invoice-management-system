import { services } from "@/services/container";
import { route } from "@/app/api/_lib/http";
import { invoiceSettingsSchema } from "@/types/settings";

export const runtime = "nodejs";

export const GET = route({  }, ({ actor }) => services.settings.getInvoiceSettings(actor));

export const PUT = route({ body: invoiceSettingsSchema }, ({ actor, body }) => services.settings.updateInvoiceSettings(actor, body));

