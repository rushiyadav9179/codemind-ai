import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../App';

const mockHealth = {
  status: 'healthy',
  version: '0.1.0',
  environment: 'test',
  uptime: 10,
  timestamp: new Date().toISOString(),
  services: {
    api: 'up',
    database: 'unconfigured',
    redis: 'unconfigured',
  },
};

describe('App', () => {
  it('renders without crashing', () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: mockHealth }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it('renders the navigation sidebar', () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: mockHealth }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(<App />);
    expect(screen.getByRole('navigation', { name: /sidebar navigation/i })).toBeInTheDocument();
  });

  it('renders the CodeMind AI brand name', () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: mockHealth }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(<App />);
    expect(screen.getByText('CodeMind AI')).toBeInTheDocument();
  });
});
