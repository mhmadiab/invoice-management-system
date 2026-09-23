import { apiHandler, json } from "@/app/api/_lib/http";
import { checkOrigin, readRefreshCookie } from "@/app/api/_lib/auth-cookies";
import { refresh } from "@/services/auth";

export const runtime = "nodejs";
export const POST = apiHandler(async request => {
  checkOrigin(request);
  return json(await refresh(readRefreshCookie(request)));
});
