import { services } from "@/services/container";
import { apiHandler, json } from "@/app/api/_lib/http";
import { checkOrigin, readRefreshCookie } from "@/app/api/_lib/auth-cookies";

/**
 * This route is used when the client needs a new access token.
 * 1. Validate request origin by checkOrigin()
 * 2. Reades invoice_refresh=<token> by readRefreshCookie
 * 3. AuthService:
 * raw refresh token==>tokenHash()==>sessionByHash()==>ValidateSession()==>touchSession()==>accessToken()
 * 4. returns the newly created access token. by json()
 */

export const runtime = "nodejs";
export const POST = apiHandler(async request => {
  checkOrigin(request);
  return json(await services.auth.refresh(readRefreshCookie(request)));
});
