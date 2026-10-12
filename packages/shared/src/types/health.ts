export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  environment: string;
  uptime: number;
  timestamp: string;
  services: {
    api: 'up' | 'down';
    database?: 'up' | 'down' | 'unconfigured';
    redis?: 'up' | 'down' | 'unconfigured';
  };
}
