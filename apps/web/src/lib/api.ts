import type { ApiResult } from '@codemind/shared';

const API_BASE = '/api/v1';

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<ApiResult<T>> {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const data = (await response.json()) as ApiResult<T>;
  return data;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { method: 'GET', ...options }),

  post: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    }),
};
