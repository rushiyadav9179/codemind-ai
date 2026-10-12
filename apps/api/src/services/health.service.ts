import type { HealthStatus } from '@codemind/shared';

import pkg from '../../package.json';
const version = pkg.version;

export class HealthService {
  getHealthStatus(): HealthStatus {
    return {
      status: 'healthy',
      version,
      environment: process.env['NODE_ENV'] ?? 'development',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      services: {
        api: 'up',
        database: 'unconfigured',
        redis: 'unconfigured',
      },
    };
  }
}

export const healthService = new HealthService();
