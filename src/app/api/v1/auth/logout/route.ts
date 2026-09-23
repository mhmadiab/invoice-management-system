import { apiHandler, requireActor } from "@/app/api/_lib/http";
import { checkOrigin, refreshCookie } from "@/app/api/_lib/auth-cookies";
import { logout } from "@/services/auth";

export const runtime = "nodejs";
export const POST = apiHandler(async request => {
  checkOrigin(request);
  await logout(await requireActor(request));
  return new Response(null, { status: 204, headers: { "Set-Cookie": refreshCookie("", true), "Cache-Control": "no-store" } });
});
