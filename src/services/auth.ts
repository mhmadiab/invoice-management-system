import type { IAuthRepository, IUnitOfWork, SessionRecord } from "@/types/repositories";
import bcrypt from "bcryptjs";
import type { Actor } from "@/types/context";
import type { LoginInput } from "@/types/auth";
import { ApplicationError } from "@/types/errors";
import { accessToken, ACCESS_SECONDS, refreshToken, SESSION_SECONDS, signingKey, tokenHash, verifyAccessToken } from "./tokens";

const INACTIVITY_MS = 30 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
// Valid bcrypt hash used to equalize the missing-account password verification path.
const DUMMY_HASH = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxA0DkQ7KYJg7gkJYH9V8YhYK5e";
const credentialsError = () => new ApplicationError("unauthorized", "INVALID_CREDENTIALS", "Invalid email or password.");
const lockedError = () => new ApplicationError("locked", "ACCOUNT_LOCKED", "Account temporarily locked. Try again later.");

type Session = SessionRecord;

/**This centralizes the rules that determine whether an authentication session is still valid. */
export function validateSession(session: Session | null, now: Date) {
  if (!session || session.revokedAt || session.expiresAt <= now || !session.administrator.business || (session.administrator.lockedUntil && session.administrator.lockedUntil > now)) {
    throw new ApplicationError("unauthorized", "INVALID_SESSION", "Authentication session is invalid or expired.");
  }
  if (now.getTime() - session.lastActivityAt.getTime() >= INACTIVITY_MS) {
    throw new ApplicationError("unauthorized", "SESSION_EXPIRED", "Authentication session is invalid or expired.");
  }
  return session;
}

export class AuthService {
  /**The composition container (createServices) will provide the concrete implementations later. */
  constructor(
    private readonly auth: IAuthRepository,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async login(input: LoginInput, now = new Date()) {
    //initial check for admin
    signingKey();
    const administrator = await this.auth.administratorByEmail(input.email);
    const passwordMatches = await bcrypt.compare(input.password, administrator?.passwordHash ?? DUMMY_HASH);
    if (!administrator) throw credentialsError();
    //generate a refresh token 
    const token = refreshToken();

    //start of transaction, double check admin and increment of login failed, lock at 5 attempts
    const result = await this.unitOfWork.run(async repositories => {
      const repository = repositories.auth;
      const current = await repository.administratorById(administrator.administratorId);
      if (!current || current.passwordHash !== administrator.passwordHash) return { error: credentialsError() };
      if (current.lockedUntil && current.lockedUntil > now) return { error: lockedError() };
      if (!passwordMatches) {
        const attempts = (current.lockedUntil ? 0 : current.failedLoginAttempts) + 1;
        const lockedUntil = attempts >= 5 ? new Date(now.getTime() + LOCK_MS) : null;
        await repository.updateAttempts(current.administratorId, attempts, lockedUntil);
        return { error: lockedUntil ? lockedError() : credentialsError() };
      }
      //The administrator must have an associated business.
      if (!current.business) return { error: credentialsError() };
      await repository.updateAttempts(current.administratorId, 0, null);
      const expiresAt = new Date(now.getTime() + SESSION_SECONDS * 1000);
      const session = await repository.createSession(current.administratorId, tokenHash(token), expiresAt, now);
      return { session };
    });
    //end of transaction


    if (result.error) throw result.error;
    const session = result.session!;
    //It returns an access token and administrator details in body, the raw refresh token separately, and the session expiry time. Errors from the unit of work are thrown to the caller.
    return {
      body: { accessToken: await accessToken(administrator.administratorId, session.sessionId, now), tokenType: "Bearer", expiresIn: ACCESS_SECONDS, administrator: { id: administrator.administratorId, email: administrator.email } },
      refreshToken: token,
      expiresAt: session.expiresAt,
    };
  }

  async refresh(token: string | undefined, now = new Date()) {
    signingKey();
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new ApplicationError("unauthorized", "INVALID_SESSION", "Authentication session is invalid or expired.");
    return this.unitOfWork.run(async repositories => {
      const repository = repositories.auth;
      const session = validateSession(await repository.sessionByHash(tokenHash(token)), now);
      await repository.touchSession(session.sessionId, now);
      return { accessToken: await accessToken(session.administratorId, session.sessionId, now), tokenType: "Bearer", expiresIn: ACCESS_SECONDS };
    });
  }

  async authenticate(token: string | undefined, now = new Date()): Promise<Actor> {
    if (!token) throw new ApplicationError("unauthorized", "UNAUTHORIZED", "Authentication required.");
    const claims = await verifyAccessToken(token, now);
    return this.unitOfWork.run(async repositories => {
      const repository = repositories.auth;
      const session = validateSession(await repository.sessionById(claims.sessionId), now);
      if (session.administratorId !== claims.administratorId) throw new ApplicationError("unauthorized", "UNAUTHORIZED", "Authentication required.");
      await repository.touchSession(session.sessionId, now);
      return { ...claims, businessId: session.administrator.business!.businessId };
    });
  }

  async logout(actor: Actor, now = new Date()) {
    await this.auth.revokeSession(actor.sessionId, actor.administratorId, now);
  }
}
