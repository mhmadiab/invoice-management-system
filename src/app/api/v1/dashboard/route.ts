import { route } from "@/app/api/_lib/http";
import { dashboard } from "@/services/dashboard";

export const runtime = "nodejs";

export const GET = route({  }, ({ actor }) => dashboard(actor));

