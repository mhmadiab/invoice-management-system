import { services } from "@/services/container";
import { route } from "@/app/api/_lib/http";

export const runtime = "nodejs";

export const GET = route({  }, ({ actor }) => services.dashboard.dashboard(actor));

