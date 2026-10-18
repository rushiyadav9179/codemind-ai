import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { authRepository } from '../repositories/auth.repository';
import { HttpError } from './errorHandler';

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authorization = req.get('authorization');
    const match = authorization?.match(/^Bearer ([^\s]+)$/);
    const token = match?.[1];
    if (!token) {
      throw new HttpError(401, 'UNAUTHENTICATED', 'Authentication is required');
    }

    const { userId } = authService.verifyAccessToken(token);
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new HttpError(401, 'UNAUTHENTICATED', 'Authentication is required');
    }
    req.auth = { userId: user.id, email: user.email, role: user.role };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: Array<'USER' | 'ADMIN'>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new HttpError(401, 'UNAUTHENTICATED', 'Authentication is required'));
      return;
    }
    if (!roles.includes(req.auth.role)) {
      next(new HttpError(403, 'FORBIDDEN', 'You do not have permission to perform this action'));
      return;
    }
    next();
  };
}
