import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify, errors } from "jose";
import { ApplicationError } from "@/types/errors";

export const ACCESS_SECONDS = 900;
export const SESSION_SECONDS = 30 * 24 * 60 * 60;
const issuer = "invoice-management-system";
const audience = "invoice-management-api-v1";

export function signingKey() {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error("AUTH_JWT_SECRET must contain at least 32 bytes.");
  return new TextEncoder().encode(secret);
}

export function refreshToken() {
  return randomBytes(32).toString("base64url");
}
export const tokenHash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function accessToken(administratorId: bigint, sessionId: bigint, now: Date) {
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new SignJWT({ sid: sessionId.toString() }).setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(issuer).setAudience(audience).setSubject(administratorId.toString())
    .setIssuedAt(issuedAt).setExpirationTime(issuedAt + ACCESS_SECONDS).sign(signingKey());
}

export async function verifyAccessToken(token: string, now: Date) {
  const key = signingKey();
  try {
    const { payload } = await jwtVerify(token, key, { issuer, audience, algorithms: ["HS256"], typ: "JWT", currentDate: now, requiredClaims: ["exp", "iat", "sub", "sid"] });
    if (!payload.sub || !/^\d{1,19}$/.test(payload.sub) || typeof payload.sid !== "string" || !/^\d{1,19}$/.test(payload.sid)) throw new Error("Invalid claims");
    return { administratorId: BigInt(payload.sub), sessionId: BigInt(payload.sid) };
  } catch (error) {
    if (error instanceof errors.JWTExpired) throw new ApplicationError("unauthorized", "ACCESS_TOKEN_EXPIRED", "Access token has expired.");
    throw new ApplicationError("unauthorized", "UNAUTHORIZED", "Authentication required.");
  }
}
