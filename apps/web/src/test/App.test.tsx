import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from '../App';
import { setAccessToken } from '../lib/authSession';

const mockAuthFetch = () =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({
        success: false,
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Session is no longer valid' },
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    ),
  );

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    setAccessToken(null);
    document.cookie = 'cm_csrf=; Max-Age=0; path=/';
  });

  it('renders without crashing', async () => {
    mockAuthFetch();
    const { container } = render(<App />);
    expect(container).toBeTruthy();
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('redirects unauthenticated dashboard visitors to login', async () => {
    mockAuthFetch();
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('logs in and navigates to the protected dashboard', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).endsWith('/auth/login')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken: 'logged-in-access-token',
              user: { id: 'user-1', email: 'dev@example.test', role: 'USER' },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            status: 'healthy',
            version: '0.1.0',
            environment: 'test',
            uptime: 1,
            timestamp: new Date().toISOString(),
            services: { api: 'up', database: 'up', redis: 'unconfigured' },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    render(<App />);

    fireEvent.change(await screen.findByLabelText('Email address'), {
      target: { value: 'DEV@EXAMPLE.TEST' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'StrongPassword123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('navigation', { name: /sidebar navigation/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('dev@example.test')).toBeInTheDocument();
  });

  it('registers and navigates to the protected dashboard', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).endsWith('/auth/register')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken: 'registered-access-token',
              user: { id: 'user-2', email: 'new@example.test', role: 'USER' },
            },
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            status: 'healthy',
            version: '0.1.0',
            environment: 'test',
            uptime: 1,
            timestamp: new Date().toISOString(),
            services: { api: 'up', database: 'up', redis: 'unconfigured' },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    render(<App />);

    fireEvent.click(await screen.findByRole('link', { name: 'Create an account' }));
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'new@example.test' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'StrongPassword123!' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'StrongPassword123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByRole('navigation', { name: /sidebar navigation/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('new@example.test')).toBeInTheDocument();
  });

  it('restores a valid cookie session before showing the dashboard', async () => {
    document.cookie = 'cm_csrf=test-csrf; path=/';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).endsWith('/auth/refresh')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken: 'test-access-token',
              user: { id: 'user-1', email: 'dev@example.test', role: 'USER' },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            status: 'healthy',
            version: '0.1.0',
            environment: 'test',
            uptime: 1,
            timestamp: new Date().toISOString(),
            services: { api: 'up', database: 'up', redis: 'unconfigured' },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    render(<App />);
    expect(
      await screen.findByRole('navigation', { name: /sidebar navigation/i }),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('dev@example.test')).toBeInTheDocument());
  });

  it('logs out and returns to the login screen', async () => {
    document.cookie = 'cm_csrf=test-csrf; path=/';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken: 'test-access-token',
              user: { id: 'user-1', email: 'dev@example.test', role: 'USER' },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.endsWith('/auth/logout')) {
        return new Response(JSON.stringify({ success: true, data: { loggedOut: true } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            status: 'healthy',
            version: '0.1.0',
            environment: 'test',
            uptime: 1,
            timestamp: new Date().toISOString(),
            services: { api: 'up', database: 'up', redis: 'unconfigured' },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });

    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /log out/i }));
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });
});
