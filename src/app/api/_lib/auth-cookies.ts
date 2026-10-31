import { ApplicationError } from "@/types/errors";
import { SESSION_SECONDS } from "@/services/tokens";
import config from "@/config";


//name of the cookie to store the refresh token 
export const REFRESH_COOKIE = "invoice_refresh";


/*
server --> client
create or delete the refresh token cookie
Generate the HTTP cookie string used to set(login) or remove(logout) the refresh token.
*/
export function refreshCookie(token: string, clear = false) {
  return `${REFRESH_COOKIE}=${token}; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Strict; Max-Age=${clear ? 0 : SESSION_SECONDS}`;
}


/*
returns the refresh token from incoming request: Cookie: theme=dark; invoice_refresh=ABC123; language=en 
client --> server
*/
export function readRefreshCookie(request: Request) {
  return request.headers.get("cookie")?.split(";").map(value => value.trim()).find(value => value.startsWith(`${REFRESH_COOKIE}=`))?.slice(REFRESH_COOKIE.length + 1);
}


//verify where an authentication request originated 
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = config.app.origin ?? new URL(request.url).origin;
  if (origin && origin !== expected) throw new ApplicationError("unauthorized", "UNAUTHORIZED", "Authentication required.");
}
