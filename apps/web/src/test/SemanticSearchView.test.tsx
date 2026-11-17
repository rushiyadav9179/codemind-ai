import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SemanticSearchView } from '../components/search/SemanticSearchView';
import type { IndexStatus, Repository, SearchResult } from '../types';

// Mock the hooks — we test the UI layer, not the API client
vi.mock('../hooks/useSearch', () => ({
  useIndexStatus: vi.fn(),
  useTriggerIndex: vi.fn(),
  useSemanticSearch: vi.fn(),
}));

import { useIndexStatus, useTriggerIndex, useSemanticSearch } from '../hooks/useSearch';

const mockUseIndexStatus = vi.mocked(useIndexStatus);
const mockUseTriggerIndex = vi.mocked(useTriggerIndex);
const mockUseSemanticSearch = vi.mocked(useSemanticSearch);

function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

const mockRepository: Repository = {
  id: 'repo-aaaa-bbbb-cccc',
  ownerId: 'user-1234',
  name: 'codemind-api',
  description: 'API codebase for semantic search tests',
  sourceType: 'MANUAL',
  defaultBranch: 'main',
  language: 'TypeScript',
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const notIndexedStatus: IndexStatus = {
  repositoryId: mockRepository.id,
  analysisRunId: null,
  indexedUnits: 0,
  skippedUnits: 0,
  embeddingModel: null,
  status: 'not_indexed',
};

const indexedStatus: IndexStatus = {
  repositoryId: mockRepository.id,
  analysisRunId: 'run-1111-2222-3333',
  indexedUnits: 42,
  skippedUnits: 2,
  embeddingModel: 'nomic-embed-text',
  status: 'indexed',
};

const mockResults: SearchResult[] = [
  {
    id: 'emb-0001',
    repositoryId: mockRepository.id,
    analysisRunId: 'run-1111-2222-3333',
    analyzedFileId: 'file-aaaa',
    filePath: 'src/auth/tokenService.ts',
    unitKind: 'function',
    unitName: 'rotateRefreshToken',
    startLine: 5,
    endLine: 10,
    contentPreview: 'async function rotateRefreshToken(oldToken: string): Promise<string>',
    embeddingModel: 'nomic-embed-text',
    score: 0.921,
  },
  {
    id: 'emb-0002',
    repositoryId: mockRepository.id,
    analysisRunId: 'run-1111-2222-3333',
    analyzedFileId: 'file-bbbb',
    filePath: 'src/middleware/auth.ts',
    unitKind: 'method',
    unitName: 'AuthMiddleware.validate',
    startLine: 20,
    endLine: 35,
    contentPreview: 'validate(token: string): boolean',
    embeddingModel: 'nomic-embed-text',
    score: 0.871,
  },
  {
    id: 'emb-0003',
    repositoryId: mockRepository.id,
    analysisRunId: 'run-1111-2222-3333',
    analyzedFileId: 'file-cccc',
    filePath: 'src/services/userService.ts',
    unitKind: 'class',
    unitName: 'UserService',
    startLine: 1,
    endLine: 50,
    contentPreview: 'class UserService in src/services/userService.ts',
    embeddingModel: 'nomic-embed-text',
    score: 0.712,
  },
];

function renderComponent(onBack = vi.fn()) {
  const queryClient = createTestQueryClient();
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <SemanticSearchView repository={mockRepository} onBack={onBack} />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('SemanticSearchView', () => {
  it('renders "not indexed" empty state with Index Repository button', async () => {
    mockUseIndexStatus.mockReturnValue({
      data: notIndexedStatus,
      isLoading: false,
    } as ReturnType<typeof useIndexStatus>);

    mockUseTriggerIndex.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
    } as unknown as ReturnType<typeof useTriggerIndex>);

    mockUseSemanticSearch.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: null,
    } as unknown as ReturnType<typeof useSemanticSearch>);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Repository Not Indexed')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Index Repository').length).toBeGreaterThan(0);
  });

  it('renders search input when repository is indexed', async () => {
    mockUseIndexStatus.mockReturnValue({
      data: indexedStatus,
      isLoading: false,
    } as ReturnType<typeof useIndexStatus>);

    mockUseTriggerIndex.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
    } as unknown as ReturnType<typeof useTriggerIndex>);

    mockUseSemanticSearch.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: null,
    } as unknown as ReturnType<typeof useSemanticSearch>);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/describe what you're looking for/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('shows indexing spinner while status is indexing', async () => {
    const indexingStatus: IndexStatus = { ...notIndexedStatus, status: 'indexing' };

    mockUseIndexStatus.mockReturnValue({
      data: indexingStatus,
      isLoading: false,
    } as ReturnType<typeof useIndexStatus>);

    mockUseTriggerIndex.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
      error: null,
    } as unknown as ReturnType<typeof useTriggerIndex>);

    mockUseSemanticSearch.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: null,
    } as unknown as ReturnType<typeof useSemanticSearch>);

    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText(/indexing in progress/i).length).toBeGreaterThan(0);
    });
  });

  it('renders search results (3 items) after mutation resolves', async () => {
    mockUseIndexStatus.mockReturnValue({
      data: indexedStatus,
      isLoading: false,
    } as ReturnType<typeof useIndexStatus>);

    mockUseTriggerIndex.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
    } as unknown as ReturnType<typeof useTriggerIndex>);

    mockUseSemanticSearch.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: true,
      isError: false,
      data: mockResults,
      error: null,
    } as unknown as ReturnType<typeof useSemanticSearch>);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('rotateRefreshToken')).toBeInTheDocument();
      expect(screen.getByText('AuthMiddleware.validate')).toBeInTheDocument();
      expect(screen.getByText('UserService')).toBeInTheDocument();
    });

    expect(screen.getByText('3 results found')).toBeInTheDocument();
  });

  it('shows MODEL_UNAVAILABLE error when indexing fails with model error', async () => {
    const mutateMock = vi
      .fn()
      .mockRejectedValue(new Error('MODEL_UNAVAILABLE: Ollama not running'));

    mockUseIndexStatus.mockReturnValue({
      data: notIndexedStatus,
      isLoading: false,
    } as ReturnType<typeof useIndexStatus>);

    mockUseTriggerIndex.mockReturnValue({
      mutateAsync: mutateMock,
      isPending: false,
      error: null,
    } as unknown as ReturnType<typeof useTriggerIndex>);

    mockUseSemanticSearch.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: null,
    } as unknown as ReturnType<typeof useSemanticSearch>);

    renderComponent();

    // Click "Index Repository" button
    const indexBtn = screen.getAllByRole('button', { name: /index repository/i })[0]!;
    fireEvent.click(indexBtn);

    await waitFor(() => {
      expect(screen.getByText('Embedding Model Unavailable')).toBeInTheDocument();
    });
    expect(screen.getByText(/ollama is required/i)).toBeInTheDocument();
  });
});
