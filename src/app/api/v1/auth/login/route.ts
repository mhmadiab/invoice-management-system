import { apiHandler, json, readBody } from "@/app/api/_lib/http";
import { checkOrigin, refreshCookie } from "@/app/api/_lib/auth-cookies";
import { loginSchema } from "@/types/auth";
import { login } from "@/services/auth";

export const runtime = "nodejs";
export const POST = apiHandler(async request => {
  checkOrigin(request);
  const result = await login(await readBody(request, loginSchema));
  return json(result.body, 200, { "Set-Cookie": refreshCookie(result.refreshToken) });
});
