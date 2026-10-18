import { createHash, randomBytes, randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import type { Role } from '@prisma/client';
import { z } from 'zod';
import type { AuthUser } from '@codemind/shared';
import { env } from '../config/env';
import { HttpError } from '../middleware/errorHandler';
import { authRepository, type UserRecord } from '../repositories/auth.repository';

const REFRESH_TOKEN_BYTES = 48;
const CSRF_TOKEN_BYTES = 32;
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$ZF10cSJ4ml7Uia8/TRk/dg$h8AaxRSAfNfaOnWOB+I1a1msb4iW2uHhGQb6i4j+K0w';

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
  refreshToken: string;
  csrfToken: string;
  refreshExpiresAt: Date;
}

const hashSecret = (value: string): string => createHash('sha256').update(value).digest('hex');

const toAuthUser = (user: Pick<UserRecord, 'id' | 'email' | 'role'>): AuthUser => ({
  id: user.id,
  email: user.email,
  role: user.role,
});

const createAccessToken = (user: Pick<UserRecord, 'id'>): string =>
  jwt.sign({}, env.AUTH_ACCESS_TOKEN_SECRET, {
    algorithm: 'HS256',
    subject: user.id,
    issuer: env.AUTH_JWT_ISSUER,
    audience: env.AUTH_JWT_AUDIENCE,
    expiresIn: env.AUTH_ACCESS_TOKEN_TTL_SECONDS,
  });

const makeSecrets = () => ({
  refreshToken: randomBytes(REFRESH_TOKEN_BYTES).toString('base64url'),
  csrfToken: randomBytes(CSRF_TOKEN_BYTES).toString('base64url'),
});

const newRefreshExpiry = (): Date =>
  new Date(Date.now() + env.AUTH_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

const isRole = (role: Role): role is Role => role === 'USER' || role === 'ADMIN';

export const authService = {
  async register(email: string, password: string): Promise<AuthSession> {
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });

    let user: UserRecord;
    try {
      user = await authRepository.createUser(email, passwordHash);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new HttpError(409, 'REGISTRATION_UNAVAILABLE', 'Unable to create an account');
      }
      throw error;
    }

    return this.createSession(user);
  },

  async login(email: string, password: string): Promise<AuthSession> {
    const user = await authRepository.findUserByEmail(email);
    const passwordMatches = await argon2.verify(
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
      password,
    );

    if (!user || !passwordMatches) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    return this.createSession(user);
  },

  async refresh(refreshToken: string, csrfToken: string): Promise<AuthSession> {
    const secrets = makeSecrets();
    let result;
    try {
      result = await authRepository.rotateRefreshToken({
        tokenHash: hashSecret(refreshToken),
        csrfTokenHash: hashSecret(csrfToken),
        nextTokenHash: hashSecret(secrets.refreshToken),
        nextCsrfTokenHash: hashSecret(secrets.csrfToken),
        expiresAt: newRefreshExpiry(),
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        await authRepository.revokeRefreshFamily(hashSecret(refreshToken));
        throw new HttpError(401, 'INVALID_REFRESH_TOKEN', 'Session is no longer valid');
      }
      throw error;
    }

    if (result.kind !== 'rotated') {
      throw new HttpError(401, 'INVALID_REFRESH_TOKEN', 'Session is no longer valid');
    }

    return {
      accessToken: createAccessToken(result.user),
      user: toAuthUser(result.user),
      refreshToken: secrets.refreshToken,
      csrfToken: secrets.csrfToken,
      refreshExpiresAt: result.refreshExpiresAt,
    };
  },

  async logout(refreshToken: string | undefined, csrfToken: string | undefined): Promise<void> {
    if (refreshToken) {
      const token = await authRepository.findRefreshToken(hashSecret(refreshToken));
      if (token && (!csrfToken || token.csrfTokenHash !== hashSecret(csrfToken))) {
        throw new HttpError(403, 'CSRF_VALIDATION_FAILED', 'CSRF validation failed');
      }
      if (token) await authRepository.revokeRefreshToken(hashSecret(refreshToken));
    }
  },

  async logoutAll(userId: string): Promise<number> {
    return authRepository.revokeAllRefreshTokens(userId);
  },

  async getCurrentUser(userId: string): Promise<AuthUser> {
    const user = await authRepository.findUserById(userId);
    if (!user || !isRole(user.role)) {
      throw new HttpError(401, 'UNAUTHENTICATED', 'Authentication is required');
    }
    return toAuthUser(user);
  },

  verifyAccessToken(token: string): { userId: string } {
    try {
      const payload = jwt.verify(token, env.AUTH_ACCESS_TOKEN_SECRET, {
        algorithms: ['HS256'],
        issuer: env.AUTH_JWT_ISSUER,
        audience: env.AUTH_JWT_AUDIENCE,
      });
      if (
        typeof payload === 'string' ||
        !payload.sub ||
        !z.string().uuid().safeParse(payload.sub).success ||
        typeof payload.iat !== 'number' ||
        typeof payload.exp !== 'number' ||
        payload.exp <= Math.floor(Date.now() / 1000)
      ) {
        throw new Error('Invalid token subject');
      }
      return { userId: payload.sub };
    } catch {
      throw new HttpError(401, 'UNAUTHENTICATED', 'Authentication is required');
    }
  },

  async createSession(user: UserRecord): Promise<AuthSession> {
    const secrets = makeSecrets();
    const refreshExpiresAt = newRefreshExpiry();
    await authRepository.createRefreshToken({
      tokenHash: hashSecret(secrets.refreshToken),
      csrfTokenHash: hashSecret(secrets.csrfToken),
      familyId: randomUUID(),
      userId: user.id,
      expiresAt: refreshExpiresAt,
    });
    return {
      accessToken: createAccessToken(user),
      user: toAuthUser(user),
      refreshToken: secrets.refreshToken,
      csrfToken: secrets.csrfToken,
      refreshExpiresAt,
    };
  },
};
