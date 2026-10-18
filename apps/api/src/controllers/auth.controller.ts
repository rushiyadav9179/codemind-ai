import type { Request, Response } from 'express';
import type { ApiResponse, AuthUser } from '@codemind/shared';
import { z } from 'zod';
import { env } from '../config/env';
import { HttpError } from '../middleware/errorHandler';
import { authService } from '../services/auth.service';

const emailSchema = z.string().trim().toLowerCase().email().max(254);
const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters')
  .max(128, 'Password must be 128 characters or fewer')
  .refine((password) => {
    const groups = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) =>
      pattern.test(password),
    );
    return groups.length >= 3;
  }, 'Use at least three of: lowercase, uppercase, number, and symbol');

const registerSchema = z.object({ email: emailSchema, password: passwordSchema }).strict();
const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) }).strict();

const refreshCookieName = 'cm_refresh';
const csrfCookieName = 'cm_csrf';
const cookiePath = '/api/v1/auth';

const commonCookieOptions = {
  secure: env.AUTH_COOKIE_SECURE,
  sameSite: env.AUTH_COOKIE_SAME_SITE,
} as const;

function setSessionCookies(res: Response, session: Awaited<ReturnType<typeof authService.login>>) {
  const maxAge = Math.max(0, session.refreshExpiresAt.getTime() - Date.now());
  res.cookie(refreshCookieName, session.refreshToken, {
    ...commonCookieOptions,
    httpOnly: true,
    path: cookiePath,
    maxAge,
  });
  res.cookie(csrfCookieName, session.csrfToken, {
    ...commonCookieOptions,
    httpOnly: false,
    path: '/',
    maxAge,
  });
}

function clearSessionCookies(res: Response): void {
  res.clearCookie(refreshCookieName, {
    ...commonCookieOptions,
    httpOnly: true,
    path: cookiePath,
  });
  res.clearCookie(csrfCookieName, {
    ...commonCookieOptions,
    httpOnly: false,
    path: '/',
  });
}

function sendSession(res: Response, session: Awaited<ReturnType<typeof authService.login>>) {
  setSessionCookies(res, session);
  const body: ApiResponse<{ accessToken: string; user: AuthUser }> = {
    success: true,
    data: { accessToken: session.accessToken, user: session.user },
    timestamp: new Date().toISOString(),
  };
  res.status(200).json(body);
}

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const input = registerSchema.parse(req.body);
    const session = await authService.register(input.email, input.password);
    setSessionCookies(res, session);
    const body: ApiResponse<{ accessToken: string; user: AuthUser }> = {
      success: true,
      data: { accessToken: session.accessToken, user: session.user },
      timestamp: new Date().toISOString(),
    };
    res.status(201).json(body);
  },

  async login(req: Request, res: Response): Promise<void> {
    const input = loginSchema.parse(req.body);
    sendSession(res, await authService.login(input.email, input.password));
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies?.[refreshCookieName];
    if (!refreshToken || !req.csrfToken) {
      throw new HttpError(401, 'INVALID_REFRESH_TOKEN', 'Session is no longer valid');
    }
    sendSession(res, await authService.refresh(refreshToken, req.csrfToken));
  },

  async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies?.[refreshCookieName];
    await authService.logout(refreshToken, req.csrfToken);
    clearSessionCookies(res);
    const body: ApiResponse<{ loggedOut: true }> = {
      success: true,
      data: { loggedOut: true },
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(body);
  },

  async logoutAll(req: Request, res: Response): Promise<void> {
    if (!req.auth) throw new HttpError(401, 'UNAUTHENTICATED', 'Authentication is required');
    const revokedSessions = await authService.logoutAll(req.auth.userId);
    clearSessionCookies(res);
    const body: ApiResponse<{ revokedSessions: number }> = {
      success: true,
      data: { revokedSessions },
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(body);
  },

  async me(req: Request, res: Response): Promise<void> {
    if (!req.auth) throw new HttpError(401, 'UNAUTHENTICATED', 'Authentication is required');
    const user = await authService.getCurrentUser(req.auth.userId);
    const body: ApiResponse<AuthUser> = {
      success: true,
      data: user,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(body);
  },

  admin(req: Request, res: Response): void {
    const body: ApiResponse<{ access: 'admin' }> = {
      success: true,
      data: { access: 'admin' },
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(body);
  },
};
