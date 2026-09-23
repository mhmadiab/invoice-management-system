import { route } from "@/app/api/_lib/http";
import { listEmailTemplates } from "@/services/settings";

export const runtime = "nodejs";

export const GET = route({  }, ({ actor }) => listEmailTemplates(actor));

