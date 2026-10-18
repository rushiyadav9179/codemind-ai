import type { ApiResult, AuthSessionResponse } from '@codemind/shared';

let accessToken: string | null = null;
let refreshRequest: Promise<AuthSessionResponse | null> | null = null;
const expirationListeners = new Set<() => void>();

export class AuthRequestError extends Error {}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (!token) expirationListeners.forEach((listener) => listener());
}

export function subscribeToSessionExpiration(listener: () => void): () => void {
  expirationListeners.add(listener);
  return () => expirationListeners.delete(listener);
}

function readCsrfCookie(): string | null {
  const value = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('cm_csrf='))
    ?.slice('cm_csrf='.length);
  return value ? decodeURIComponent(value) : null;
}

async function readResponse<T>(response: Response): Promise<T> {
  const result = (await response.json()) as ApiResult<T>;
  if (!response.ok || !result.success) {
    throw new AuthRequestError(
      result.success ? 'The authentication request failed' : result.error.message,
    );
  }
  return result.data;
}

export async function authRequest(
  endpoint: '/login' | '/register' | '/logout',
  body?: unknown,
): Promise<AuthSessionResponse | { loggedOut: true }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (endpoint === '/logout') {
    const csrfToken = readCsrfCookie();
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  }
  const response = await fetch(`/api/v1/auth${endpoint}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return readResponse(response);
}

async function performRefresh(): Promise<AuthSessionResponse | null> {
  const csrfToken = readCsrfCookie();
  if (!csrfToken) {
    setAccessToken(null);
    return null;
  }

  const response = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-CSRF-Token': csrfToken },
  });

  if (response.status === 401 || response.status === 403) {
    setAccessToken(null);
    return null;
  }

  const session = await readResponse<AuthSessionResponse>(response);
  setAccessToken(session.accessToken);
  return session;
}

export function refreshAuthSession(): Promise<AuthSessionResponse | null> {
  if (!refreshRequest) {
    refreshRequest = performRefresh().finally(() => {
      refreshRequest = null;
    });
  }
  return refreshRequest;
}
