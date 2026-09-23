import { ApplicationError } from "@/types/errors";
import { SESSION_SECONDS } from "@/services/tokens";

export const REFRESH_COOKIE = "invoice_refresh";
export function refreshCookie(token: string, clear = false) {
  return `${REFRESH_COOKIE}=${token}; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Strict; Max-Age=${clear ? 0 : SESSION_SECONDS}`;
}
export function readRefreshCookie(request: Request) {
  return request.headers.get("cookie")?.split(";").map(value => value.trim()).find(value => value.startsWith(`${REFRESH_COOKIE}=`))?.slice(REFRESH_COOKIE.length + 1);
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_ORIGIN ?? new URL(request.url).origin;
  if (origin && origin !== expected) throw new ApplicationError("unauthorized", "UNAUTHORIZED", "Authentication required.");
}
