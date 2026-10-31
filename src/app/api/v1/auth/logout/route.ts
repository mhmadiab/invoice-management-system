import { services } from "@/services/container";
import { apiHandler, requireActor } from "@/app/api/_lib/http";
import { checkOrigin, refreshCookie } from "@/app/api/_lib/auth-cookies";

/**
 * Logout combines access-token authentication + session revocation + cookie deletion.
 * 1. check origin
 * 2. requireActor() ==> {
                          administratorId,
                          businessId,
                          sessionId
                        } 
  
 * 3. Revoke the session, The server-side authentication session is now invalid.
   4. refreshCookie("", true) ==> produces a cookie with: MaxAge=0 telling the browser to remove it.
   So, the logout invalidates both sides, server (revoked) and client (refresh cookie) 
   5. status 204
 */

export const runtime = "nodejs";
export const POST = apiHandler(async request => {
  checkOrigin(request);
  await services.auth.logout(await requireActor(request));
  return new Response(null, { status: 204, headers: { "Set-Cookie": refreshCookie("", true), "Cache-Control": "no-store" } });
});
