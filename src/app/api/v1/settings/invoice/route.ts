import { route } from "@/app/api/_lib/http";
import { getInvoiceSettings, updateInvoiceSettings } from "@/services/settings";
import { invoiceSettingsSchema } from "@/types/settings";

export const runtime = "nodejs";

export const GET = route({  }, ({ actor }) => getInvoiceSettings(actor));

export const PUT = route({ body: invoiceSettingsSchema }, ({ actor, body }) => updateInvoiceSettings(actor, body));

