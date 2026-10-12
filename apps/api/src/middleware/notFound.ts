import type { Request, Response } from 'express';
import type { ApiError } from '@codemind/shared';

export const notFoundHandler = (_req: Request, res: Response): void => {
  const body: ApiError = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${_req.method} ${_req.path} not found`,
    },
    timestamp: new Date().toISOString(),
  };
  res.status(404).json(body);
};
