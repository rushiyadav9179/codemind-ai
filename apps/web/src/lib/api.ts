import type { ApiResult } from '@codemind/shared';
import { getAccessToken, refreshAuthSession, setAccessToken } from './authSession';

const API_BASE = '/api/v1';
const cookieAuthEndpoints = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
]);

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<ApiResult<T>> {
  const isCookieAuthEndpoint = cookieAuthEndpoints.has(endpoint);
  const request = async (retry: boolean): Promise<ApiResult<T>> => {
    const headers = new Headers(options?.headers);
    headers.set('Content-Type', 'application/json');
    const token = getAccessToken();
    if (token && !isCookieAuthEndpoint) headers.set('Authorization', `Bearer ${token}`);

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (response.status === 401 && retry && token && !isCookieAuthEndpoint) {
      const session = await refreshAuthSession();
      if (session) return request(false);
      setAccessToken(null);
    } else if (response.status === 401 && !retry) {
      setAccessToken(null);
    }

    return (await response.json()) as ApiResult<T>;
  };

  return request(true);
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

  patch: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
      ...options,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { method: 'DELETE', ...options }),
};
