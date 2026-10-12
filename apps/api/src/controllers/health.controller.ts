import type { Request, Response } from 'express';
import type { ApiResponse, HealthStatus } from '@codemind/shared';
import { healthService } from '../services/health.service';

export const healthController = {
  getHealth: (_req: Request, res: Response): void => {
    const status = healthService.getHealthStatus();

    const response: ApiResponse<HealthStatus> = {
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  },
};
