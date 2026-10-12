import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import type { HealthStatus } from '../types';

export function useApiHealth() {
  return useQuery({
    queryKey: ['api-health'],
    queryFn: async () => {
      const result = await apiClient.get<HealthStatus>('/health');
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
