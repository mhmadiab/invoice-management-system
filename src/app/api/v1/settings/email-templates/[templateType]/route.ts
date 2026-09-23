import { route } from "@/app/api/_lib/http";
import { updateEmailTemplate } from "@/services/settings";
import { emailTemplateSchema, templateParamsSchema } from "@/types/settings";

export const runtime = "nodejs";

export const PUT = route({ params: templateParamsSchema, body: emailTemplateSchema }, ({ actor, params, body }) => updateEmailTemplate(actor, params.templateType, body));

