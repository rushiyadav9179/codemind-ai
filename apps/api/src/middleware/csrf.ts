import type { Request, Response, NextFunction } from 'express';
import type { ApiError } from '@codemind/shared';
import { env } from '../config/env';
import { HttpError } from './errorHandler';

const allowedOrigins = env.CORS_ORIGINS.split(',').map((origin) => origin.trim());

export function requireTrustedOrigin(req: Request, _res: Response, next: NextFunction): void {
  const origin = req.get('origin');
  if (!origin || !allowedOrigins.includes(origin)) {
    next(new HttpError(403, 'UNTRUSTED_ORIGIN', 'Request origin is not allowed'));
    return;
  }
  next();
}

export function requireCsrf(req: Request, _res: Response, next: NextFunction): void {
  const csrfCookie = req.cookies?.['cm_csrf'];
  const csrfHeader = req.get('x-csrf-token');
  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    const body: ApiError = {
      success: false,
      error: { code: 'CSRF_VALIDATION_FAILED', message: 'CSRF validation failed' },
      timestamp: new Date().toISOString(),
    };
    _res.status(403).json(body);
    return;
  }
  req.csrfToken = csrfCookie;
  next();
}
