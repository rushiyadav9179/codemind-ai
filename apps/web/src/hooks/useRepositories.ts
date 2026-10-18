import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import type {
  CreateRepositoryInput,
  PaginatedRepositories,
  Repository,
  UpdateRepositoryInput,
} from '../types';

export function useRepositories(params: { page: number; limit: number; search?: string }) {
  const queryParams = new URLSearchParams();
  queryParams.set('page', params.page.toString());
  queryParams.set('limit', params.limit.toString());
  if (params.search) queryParams.set('search', params.search);

  return useQuery({
    queryKey: ['repositories', params],
    queryFn: async () => {
      const result = await apiClient.get<PaginatedRepositories>(
        `/repositories?${queryParams.toString()}`,
      );
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}

export function useCreateRepository() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRepositoryInput) => {
      const result = await apiClient.post<Repository>('/repositories', input);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
    },
  });
}

export function useUpdateRepository() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateRepositoryInput }) => {
      const result = await apiClient.patch<Repository>(`/repositories/${id}`, input);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
    },
  });
}

export function useDeleteRepository() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await apiClient.delete<{ deleted: boolean; id: string }>(
        `/repositories/${id}`,
      );
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
    },
  });
}
