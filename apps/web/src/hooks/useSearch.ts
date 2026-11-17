import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import type { IndexStatus, SearchResult } from '../types';

export function useIndexStatus(repositoryId: string | undefined) {
  return useQuery({
    queryKey: ['search-index-status', repositoryId],
    queryFn: async () => {
      if (!repositoryId) return null;
      const result = await apiClient.get<IndexStatus>(
        `/repositories/${repositoryId}/search/status`,
      );
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: Boolean(repositoryId),
    refetchInterval: (query) => {
      // Poll every 2s while indexing
      if (query.state.data?.status === 'indexing') return 2000;
      return false;
    },
  });
}

export function useTriggerIndex(repositoryId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!repositoryId) throw new Error('Repository ID required');
      const result = await apiClient.post<IndexStatus>(
        `/repositories/${repositoryId}/search/index`,
        {},
      );
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-index-status', repositoryId] });
    },
  });
}

export function useSemanticSearch(repositoryId: string | undefined) {
  return useMutation({
    mutationFn: async (query: string) => {
      if (!repositoryId) throw new Error('Repository ID required');
      const params = new URLSearchParams({ q: query, limit: '10' });
      const result = await apiClient.get<SearchResult[]>(
        `/repositories/${repositoryId}/search/query?${params.toString()}`,
      );
      if (!result.success) throw new Error(result.error.message);
      return result.data ?? [];
    },
  });
}
