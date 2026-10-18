import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import type { ApiError } from '@codemind/shared';
import { authController } from '../../controllers/auth.controller';
import { requireAuth, requireRole } from '../../middleware/auth';
import { requireCsrf, requireTrustedOrigin } from '../../middleware/csrf';

const createLimiter = (limit: number, windowMs: number) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req: Request, res: Response) => {
      const body: ApiError = {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
        timestamp: new Date().toISOString(),
      };
      res.status(429).json(body);
    },
  });

const registrationLimiter = createLimiter(5, 60 * 60 * 1000);
const loginLimiter = createLimiter(10, 15 * 60 * 1000);
const refreshLimiter = createLimiter(30, 15 * 60 * 1000);

const router = Router();

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.post('/register', requireTrustedOrigin, registrationLimiter, authController.register);
router.post('/login', requireTrustedOrigin, loginLimiter, authController.login);
router.post('/refresh', requireTrustedOrigin, refreshLimiter, requireCsrf, authController.refresh);
router.post('/logout', requireTrustedOrigin, requireCsrf, authController.logout);
router.post('/logout-all', requireAuth, authController.logoutAll);
router.get('/me', requireAuth, authController.me);
router.get('/admin', requireAuth, requireRole('ADMIN'), authController.admin);

export default router;
