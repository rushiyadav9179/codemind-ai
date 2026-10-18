import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../auth/AuthProvider';
import { apiClient } from '../lib/api';
import { setAccessToken } from '../lib/authSession';
import { AuthPage } from '../pages/AuthPage';

function renderPage(mode: 'login' | 'register') {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <AuthPage mode={mode} />
      </AuthProvider>
    </MemoryRouter>,
  );
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function SessionProbe() {
  const { user } = useAuth();
  const [result, setResult] = useState('');
  return (
    <>
      <p>{user ? `Signed in as ${user.email}` : 'Signed out'}</p>
      <button
        type="button"
        onClick={async () => {
          const result = await apiClient.get<{ ok: true }>('/private');
          setResult(result.success ? 'Request succeeded' : 'Request failed');
        }}
      >
        Load private data
      </button>
      <output>{result}</output>
    </>
  );
}

beforeEach(() => {
  setAccessToken(null);
  document.cookie = 'cm_csrf=; Max-Age=0; path=/';
});

describe('authentication forms', () => {
  it('validates registration email, password strength, and confirmation', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      response({
        success: true,
        data: { accessToken: 'unused', user: { id: 'unused', email: 'x@y.test', role: 'USER' } },
      }),
    );
    renderPage('register');

    fireEvent.change(await screen.findByLabelText('Email address'), {
      target: { value: 'developer@example.test' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'weak' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'weak' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/12–128 characters/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects mismatched registration passwords before sending a request', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      response({
        success: true,
        data: { accessToken: 'unused', user: { id: 'unused', email: 'x@y.test', role: 'USER' } },
      }),
    );
    renderPage('register');

    fireEvent.change(await screen.findByLabelText('Email address'), {
      target: { value: 'developer@example.test' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'StrongPassword123!' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'DifferentPassword456!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Passwords do not match.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows login errors and disables the form while submitting', async () => {
    let finishRequest: ((value: Response) => void) | undefined;
    const fetch = vi.spyOn(globalThis, 'fetch').mockReturnValue(
      new Promise<Response>((resolve) => {
        finishRequest = resolve;
      }),
    );
    renderPage('login');

    fireEvent.change(await screen.findByLabelText('Email address'), {
      target: { value: 'developer@example.test' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'StrongPassword123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled();

    finishRequest?.(
      response(
        {
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        },
        401,
      ),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled());
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('refreshes an expired access token once and retries the protected request', async () => {
    document.cookie = 'cm_csrf=csrf-value; path=/';
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh')) {
        return response({
          success: true,
          data: {
            accessToken:
              fetch.mock.calls.filter(([call]) => String(call).endsWith('/auth/refresh')).length > 1
                ? 'new-access-token'
                : 'initial-access-token',
            user: { id: 'user-1', email: 'developer@example.test', role: 'USER' },
          },
        });
      }
      if (url.endsWith('/private')) {
        const token = init?.headers instanceof Headers ? init.headers.get('Authorization') : null;
        if (token === 'Bearer new-access-token') {
          return response({ success: true, data: { ok: true } });
        }
        expect(token).toBe('Bearer initial-access-token');
        return response(
          { success: false, error: { code: 'UNAUTHENTICATED', message: 'Unauthorized' } },
          401,
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProbe />
        </AuthProvider>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Load private data' }));
    expect(await screen.findByText('Request succeeded')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('ends the frontend session after refresh fails without retrying indefinitely', async () => {
    document.cookie = 'cm_csrf=csrf-value; path=/';
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh')) {
        const previousRefreshCalls = fetch.mock.calls.filter(([call]) =>
          String(call).endsWith('/auth/refresh'),
        ).length;
        return previousRefreshCalls === 1
          ? response({
              success: true,
              data: {
                accessToken: 'initial-access-token',
                user: { id: 'user-1', email: 'developer@example.test', role: 'USER' },
              },
            })
          : response(
              { success: false, error: { code: 'INVALID_REFRESH_TOKEN', message: 'Expired' } },
              401,
            );
      }
      return response(
        { success: false, error: { code: 'UNAUTHENTICATED', message: 'Unauthorized' } },
        401,
      );
    });
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProbe />
        </AuthProvider>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Load private data' }));
    expect(await screen.findByText('Signed out')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
