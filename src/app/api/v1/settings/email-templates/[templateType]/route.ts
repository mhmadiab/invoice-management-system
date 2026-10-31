import { services } from "@/services/container";
import { route } from "@/app/api/_lib/http";
import { emailTemplateSchema, templateParamsSchema } from "@/types/settings";

export const runtime = "nodejs";

export const PUT = route({ params: templateParamsSchema, body: emailTemplateSchema }, ({ actor, params, body }) => services.settings.updateEmailTemplate(actor, params.templateType, body));

