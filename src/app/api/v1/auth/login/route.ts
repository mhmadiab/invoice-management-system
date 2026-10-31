import { services } from "@/services/container";
import { apiHandler, json, readBody } from "@/app/api/_lib/http";
import { checkOrigin, refreshCookie } from "@/app/api/_lib/auth-cookies";
import { loginSchema } from "@/types/auth";

/**
 * Wraps the route and provides centralized error handling.
 * If readBody() Invalid input is rejected before reaching AuthService, 
 * login() returns {
    body: {
      accessToken,
      tokenType,
      expiresIn,
      administrator
    },

    refreshToken,
    expiresAt
  }, etc. 
 * throw an ApplicationError, apiHandler() converts it into the appropriate HTTP error response.
 * the final login response conceptually looks like:
 * HTTP 200
  Body:
  {
    accessToken: "...",
    tokenType: "Bearer",
    expiresIn: 900,
    administrator: {...}
  }

  Header:
  Set-Cookie:
  invoice_refresh=<refresh-token>; ...
 */

export const runtime = "nodejs";
export const POST = apiHandler(async request => {
  checkOrigin(request);
  const result = await services.auth.login(await readBody(request, loginSchema));
  return json(result.body, 200, { "Set-Cookie": refreshCookie(result.refreshToken) });
});
