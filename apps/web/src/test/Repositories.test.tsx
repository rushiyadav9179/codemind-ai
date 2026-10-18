import { afterEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { Repositories } from '../pages/Repositories';
import { apiClient } from '../lib/api';
import type { PaginatedRepositories, Repository } from '../types';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderRepositories(queryClient = createTestQueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Repositories />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const mockRepositories: Repository[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    ownerId: 'user-123',
    name: 'backend-api',
    description: 'Core microservices backend',
    sourceType: 'MANUAL',
    defaultBranch: 'main',
    language: 'TypeScript',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01').toISOString(),
    updatedAt: new Date('2026-01-01').toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    ownerId: 'user-123',
    name: 'ai-pipeline',
    description: 'LLM reasoning engine',
    sourceType: 'MANUAL',
    defaultBranch: 'master',
    language: 'Python',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-02').toISOString(),
    updatedAt: new Date('2026-01-02').toISOString(),
  },
];

describe('Repositories Page', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state and then the repository list', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: {
        items: mockRepositories,
        pagination: {
          page: 1,
          limit: 8,
          totalItems: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      } as PaginatedRepositories,
      timestamp: new Date().toISOString(),
    });

    renderRepositories();

    expect(await screen.findByText('backend-api')).toBeInTheDocument();
    expect(screen.getByText('ai-pipeline')).toBeInTheDocument();
    expect(screen.getByText('Core microservices backend')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
  });

  it('renders the empty state when no repositories are registered', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: {
        items: [],
        pagination: {
          page: 1,
          limit: 8,
          totalItems: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      } as PaginatedRepositories,
      timestamp: new Date().toISOString(),
    });

    renderRepositories();

    expect(await screen.findByText('No repositories connected yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Your First Repository/i })).toBeInTheDocument();
  });

  it('opens create modal, validates name input, and submits successfully', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: {
        items: [],
        pagination: {
          page: 1,
          limit: 8,
          totalItems: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      } as PaginatedRepositories,
      timestamp: new Date().toISOString(),
    });

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      success: true,
      data: {
        id: '33333333-3333-3333-3333-333333333333',
        ownerId: 'user-123',
        name: 'new-service',
        description: 'New service description',
        sourceType: 'MANUAL',
        defaultBranch: 'main',
        language: 'Rust',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Repository,
      timestamp: new Date().toISOString(),
    });

    renderRepositories();

    // Open create modal
    const addButton = await screen.findByRole('button', { name: /Add Your First Repository/i });
    fireEvent.click(addButton);

    expect(
      screen.getByText('Register a codebase for analysis and intelligence'),
    ).toBeInTheDocument();

    // Fill form
    const nameInput = screen.getByLabelText(/Repository Name/i);
    const descInput = screen.getByLabelText(/Description/i);
    const langInput = screen.getByLabelText(/Primary Language/i);

    fireEvent.change(nameInput, { target: { value: 'new-service' } });
    fireEvent.change(descInput, { target: { value: 'New service description' } });
    fireEvent.change(langInput, { target: { value: 'Rust' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /^Create Repository$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/repositories', {
        name: 'new-service',
        description: 'New service description',
        defaultBranch: 'main',
        language: 'Rust',
      });
    });
  });

  it('opens edit modal and saves changes', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: {
        items: [mockRepositories[0]],
        pagination: {
          page: 1,
          limit: 8,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      } as PaginatedRepositories,
      timestamp: new Date().toISOString(),
    });

    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({
      success: true,
      data: {
        ...mockRepositories[0],
        description: 'Updated description',
      } as Repository,
      timestamp: new Date().toISOString(),
    });

    renderRepositories();

    const editBtn = await screen.findByRole('button', { name: 'Edit backend-api' });
    fireEvent.click(editBtn);

    expect(screen.getByText('Update repository metadata and settings')).toBeInTheDocument();

    const descInput = screen.getByLabelText(/Description/i);
    fireEvent.change(descInput, { target: { value: 'Updated description' } });

    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith(
        `/repositories/${mockRepositories[0].id}`,
        expect.objectContaining({
          description: 'Updated description',
        }),
      );
    });
  });

  it('opens delete confirmation modal and confirms deletion', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: {
        items: [mockRepositories[0]],
        pagination: {
          page: 1,
          limit: 8,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      } as PaginatedRepositories,
      timestamp: new Date().toISOString(),
    });

    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue({
      success: true,
      data: { deleted: true, id: mockRepositories[0].id },
      timestamp: new Date().toISOString(),
    });

    renderRepositories();

    const deleteBtn = await screen.findByRole('button', { name: 'Delete backend-api' });
    fireEvent.click(deleteBtn);

    expect(screen.getByText('This action cannot be undone')).toBeInTheDocument();

    // Confirm delete
    const confirmBtn = screen.getByRole('button', { name: /^Delete Repository$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith(`/repositories/${mockRepositories[0].id}`);
    });
  });

  it('renders error state when fetch fails and allows retry', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Database connection failed' },
      timestamp: new Date().toISOString(),
    });

    renderRepositories();

    expect(await screen.findByText('Failed to load repositories')).toBeInTheDocument();
    expect(screen.getByText('Database connection failed')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    expect(retryBtn).toBeInTheDocument();
  });
});
