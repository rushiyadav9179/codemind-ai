import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import type {
  AnalysisRun,
  AnalyzedFileDetail,
  AnalyzedFileSummary,
  DependencyGraph,
  IngestFileInput,
  PaginationMeta,
} from '../types';

export function useLatestAnalysis(repositoryId: string | undefined) {
  return useQuery({
    queryKey: ['repository-analysis-latest', repositoryId],
    queryFn: async () => {
      if (!repositoryId) return null;
      const result = await apiClient.get<AnalysisRun | null>(
        `/repositories/${repositoryId}/analysis/latest`,
      );
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: Boolean(repositoryId),
  });
}

export function useAnalysisRun(repositoryId: string | undefined, analysisId: string | undefined) {
  return useQuery({
    queryKey: ['repository-analysis-run', repositoryId, analysisId],
    queryFn: async () => {
      if (!repositoryId || !analysisId) return null;
      const result = await apiClient.get<AnalysisRun>(
        `/repositories/${repositoryId}/analysis/${analysisId}`,
      );
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: Boolean(repositoryId && analysisId),
  });
}

export function useAnalyzedFiles(params: {
  repositoryId: string | undefined;
  analysisId: string | undefined;
  page: number;
  limit: number;
  search?: string;
  language?: string;
}) {
  const { repositoryId, analysisId, page, limit, search, language } = params;
  const queryParams = new URLSearchParams();
  queryParams.set('page', page.toString());
  queryParams.set('limit', limit.toString());
  if (search) queryParams.set('search', search);
  if (language) queryParams.set('language', language);

  return useQuery({
    queryKey: ['repository-analysis-files', repositoryId, analysisId, params],
    queryFn: async () => {
      if (!repositoryId || !analysisId) return null;
      const result = await apiClient.get<{
        items: AnalyzedFileSummary[];
        pagination: PaginationMeta;
      }>(`/repositories/${repositoryId}/analysis/${analysisId}/files?${queryParams.toString()}`);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: Boolean(repositoryId && analysisId),
  });
}

export function useAnalyzedFileDetail(
  repositoryId: string | undefined,
  analysisId: string | undefined,
  fileId: string | null,
) {
  return useQuery({
    queryKey: ['repository-analysis-file-detail', repositoryId, analysisId, fileId],
    queryFn: async () => {
      if (!repositoryId || !analysisId || !fileId) return null;
      const result = await apiClient.get<AnalyzedFileDetail>(
        `/repositories/${repositoryId}/analysis/${analysisId}/files/${fileId}`,
      );
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: Boolean(repositoryId && analysisId && fileId),
  });
}

export function useDependencyGraph(
  repositoryId: string | undefined,
  analysisId: string | undefined,
) {
  return useQuery({
    queryKey: ['repository-analysis-dependencies', repositoryId, analysisId],
    queryFn: async () => {
      if (!repositoryId || !analysisId) return null;
      const result = await apiClient.get<DependencyGraph>(
        `/repositories/${repositoryId}/analysis/${analysisId}/dependencies`,
      );
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: Boolean(repositoryId && analysisId),
  });
}

export function useTriggerAnalysis(repositoryId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (files: IngestFileInput[]) => {
      if (!repositoryId) throw new Error('Repository ID is required');
      const result = await apiClient.post<AnalysisRun>(`/repositories/${repositoryId}/analysis`, {
        files,
      });
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['repository-analysis-latest', repositoryId],
      });
      queryClient.invalidateQueries({
        queryKey: ['repository-analysis-files'],
      });
      queryClient.invalidateQueries({
        queryKey: ['repository-analysis-dependencies'],
      });
    },
  });
}
