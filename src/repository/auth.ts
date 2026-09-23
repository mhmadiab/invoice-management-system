import { getPrisma } from "@/prisma/client";
import type { Database } from "./transaction";

export function authRepository(database: Database = getPrisma()) {
  return {
    administratorByEmail: (email: string) => database.administrator.findUnique({ where: { email }, include: { business: true } }),
    administratorById: (administratorId: bigint) => database.administrator.findUnique({ where: { administratorId }, include: { business: true } }),
    updateAttempts: (administratorId: bigint, failedLoginAttempts: number, lockedUntil: Date | null) => database.administrator.update({
      where: { administratorId }, data: { failedLoginAttempts, lockedUntil },
    }),
    createSession: (administratorId: bigint, refreshTokenHash: string, expiresAt: Date, now: Date) => database.authSession.create({
      data: { administratorId, refreshTokenHash, expiresAt, createdAt: now, lastActivityAt: now },
    }),
    sessionByHash: (refreshTokenHash: string) => database.authSession.findUnique({ where: { refreshTokenHash }, include: { administrator: { include: { business: true } } } }),
    sessionById: (sessionId: bigint) => database.authSession.findUnique({ where: { sessionId }, include: { administrator: { include: { business: true } } } }),
    touchSession: (sessionId: bigint, now: Date) => database.authSession.update({ where: { sessionId }, data: { lastActivityAt: now } }),
    revokeSession: (sessionId: bigint, administratorId: bigint, now: Date) => database.authSession.updateMany({ where: { sessionId, administratorId, revokedAt: null }, data: { revokedAt: now } }),
  };
}
