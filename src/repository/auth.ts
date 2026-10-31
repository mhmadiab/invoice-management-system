import type { IAuthRepository } from "@/types/repositories";
import type { Database } from "./transaction";

export class PrismaAuthRepository implements IAuthRepository {
  constructor(private readonly resolveDatabase: () => Database) {}

  private get database(): Database { return this.resolveDatabase(); }

  /** Find an administrator and It also retrieves their associated business using their email address. */
  administratorByEmail(email: string) { return this.database.administrator.findUnique({ where: { email }, include: { business: true } }); }

  /** Find an administrator and It also retrieves their associated business using their ID. */ 
  administratorById(administratorId: bigint) { return this.database.administrator.findUnique({ where: { administratorId }, include: { business: true } }); }

  /** update the adminstrator database and set failedLoginAttempts and lockedUntil values */
  updateAttempts(administratorId: bigint, failedLoginAttempts: number, lockedUntil: Date | null) { return this.database.administrator.update({
      where: { administratorId }, data: { failedLoginAttempts, lockedUntil },
    }); }

  /** This creates a server-side authentication session after successful authentication in authSessionDatabase. */
  createSession(administratorId: bigint, refreshTokenHash: string, expiresAt: Date, now: Date) { return this.database.authSession.create({
      data: { administratorId, refreshTokenHash, expiresAt, createdAt: now, lastActivityAt: now },
    }); }

  /** This searches for a session using the hashed refresh token.*/
  sessionByHash(refreshTokenHash: string) { return this.database.authSession.findUnique({ where: { refreshTokenHash }, include: { administrator: { include: { business: true } } } }); }

  /** This searches for a session using the session id .*/
  sessionById(sessionId: bigint) { return this.database.authSession.findUnique({ where: { sessionId }, include: { administrator: { include: { business: true } } } }); }

  /**perform update for lastActivity */
  touchSession(sessionId: bigint, now: Date) { return this.database.authSession.update({ where: { sessionId }, data: { lastActivityAt: now } }); }

  /** revoke a session instead of deleting it when logout*/
  revokeSession(sessionId: bigint, administratorId: bigint, now: Date) { return this.database.authSession.updateMany({ where: { sessionId, administratorId, revokedAt: null }, data: { revokedAt: now } }); }
}
