import { afterEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { CodeIntelligenceView } from '../components/intelligence/CodeIntelligenceView';
import { apiClient } from '../lib/api';
import type {
  AnalysisRun,
  AnalyzedFileDetail,
  AnalyzedFileSummary,
  DependencyGraph,
  Repository,
} from '../types';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

const mockRepository: Repository = {
  id: 'repo-1111-1111-1111',
  ownerId: 'user-123',
  name: 'intel-service',
  description: 'AI Code Intelligence Testing Repo',
  sourceType: 'MANUAL',
  defaultBranch: 'main',
  language: 'TypeScript',
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockAnalysisRun: AnalysisRun = {
  id: 'analysis-2222-2222-2222',
  repositoryId: 'repo-1111-1111-1111',
  status: 'COMPLETED',
  totalFiles: 2,
  totalLines: 85,
  summary: {
    totalFiles: 2,
    totalLines: 85,
    totalCodeLines: 60,
    languages: { typescript: 2 },
    totalFunctions: 4,
    totalClasses: 1,
    totalTypes: 2,
    internalDependencyCount: 1,
    externalDependencyCount: 2,
    topExternalDependencies: [{ name: 'axios', count: 2 }],
  },
  createdAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
};

const mockFilesSummary: AnalyzedFileSummary[] = [
  {
    id: 'file-1',
    analysisRunId: 'analysis-2222-2222-2222',
    filePath: 'src/services/api.ts',
    language: 'typescript',
    lineCount: 45,
    codeLineCount: 35,
    importCount: 2,
    exportCount: 1,
    symbolCount: 3,
    hasErrors: false,
  },
  {
    id: 'file-2',
    analysisRunId: 'analysis-2222-2222-2222',
    filePath: 'src/types/user.ts',
    language: 'typescript',
    lineCount: 40,
    codeLineCount: 25,
    importCount: 0,
    exportCount: 2,
    symbolCount: 2,
    hasErrors: false,
  },
];

const mockFileDetail: AnalyzedFileDetail = {
  ...mockFilesSummary[0],
  imports: [{ source: '../types/user', isRelative: true, specifiers: ['User'] }],
  exports: [{ name: 'ApiService', isDefault: false }],
  symbols: {
    functions: [
      {
        name: 'fetchUser',
        parameters: ['id'],
        returnType: 'Promise<User>',
        isAsync: true,
        isExported: true,
        line: 12,
      },
    ],
    classes: [
      {
        name: 'ApiService',
        methods: [],
        properties: [],
        isExported: true,
        line: 10,
      },
    ],
    types: [],
  },
  dependencies: ['src/types/user.ts'],
};

const mockDependencyGraph: DependencyGraph = {
  nodes: [
    {
      id: 'src/services/api.ts',
      label: 'src/services/api.ts',
      language: 'typescript',
      isExternal: false,
    },
    {
      id: 'src/types/user.ts',
      label: 'src/types/user.ts',
      language: 'typescript',
      isExternal: false,
    },
    { id: 'ext:axios', label: 'axios', isExternal: true },
  ],
  edges: [
    { source: 'src/services/api.ts', target: 'src/types/user.ts', isExternal: false },
    { source: 'src/services/api.ts', target: 'ext:axios', isExternal: true },
  ],
};

function renderIntelligenceView(queryClient = createTestQueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CodeIntelligenceView repository={mockRepository} onBack={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CodeIntelligenceView Component', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders overview metrics when an analysis run exists', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (endpoint) => {
      if (endpoint.includes('/analysis/latest')) {
        return {
          success: true,
          data: mockAnalysisRun,
          timestamp: new Date().toISOString(),
        };
      }
      return { success: false, error: { code: 'NOT_FOUND', message: 'Not found' }, timestamp: '' };
    });

    renderIntelligenceView();

    expect(
      await screen.findByRole('heading', { level: 2, name: /intel-service/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Files Analyzed')).toBeInTheDocument();
    expect(screen.getByText('Functions')).toBeInTheDocument();
    expect(screen.getByText('Classes & Types')).toBeInTheDocument();
    expect(screen.getByText('External Package Dependencies')).toBeInTheDocument();
    expect(screen.getByText('axios')).toBeInTheDocument();
  });

  it('renders empty state when no analysis has been executed yet', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: null,
      timestamp: new Date().toISOString(),
    });

    renderIntelligenceView();

    expect(await screen.findByText('No Code Intelligence Available Yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ingest & Analyze Code/i })).toBeInTheDocument();
  });

  it('switches to Analyzed Files tab and displays file list and AST symbol inspector', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (endpoint) => {
      if (endpoint.includes('/analysis/latest')) {
        return { success: true, data: mockAnalysisRun, timestamp: new Date().toISOString() };
      }
      if (endpoint.includes('/files/file-1')) {
        return { success: true, data: mockFileDetail, timestamp: new Date().toISOString() };
      }
      if (endpoint.includes('/files')) {
        return {
          success: true,
          data: {
            items: mockFilesSummary,
            pagination: {
              page: 1,
              limit: 15,
              totalItems: 2,
              totalPages: 1,
              hasNextPage: false,
              hasPrevPage: false,
            },
          },
          timestamp: new Date().toISOString(),
        };
      }
      return { success: false, error: { code: 'NOT_FOUND', message: '' }, timestamp: '' };
    });

    renderIntelligenceView();

    // Click on Analyzed Files tab
    const filesTab = await screen.findByRole('button', { name: /Analyzed Files/i });
    fireEvent.click(filesTab);

    expect(await screen.findByText('src/services/api.ts')).toBeInTheDocument();
    expect(screen.getByText('src/types/user.ts')).toBeInTheDocument();

    // Click on a file to inspect AST
    fireEvent.click(screen.getByText('src/services/api.ts'));

    expect(await screen.findByText('AST Structural Metadata')).toBeInTheDocument();
    expect(await screen.findByText(/fetchUser\(id\)/)).toBeInTheDocument();
    expect(await screen.findByText(/class ApiService/)).toBeInTheDocument();
  });

  it('switches to Dependency Graph tab and displays resolved connections', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (endpoint) => {
      if (endpoint.includes('/analysis/latest')) {
        return { success: true, data: mockAnalysisRun, timestamp: new Date().toISOString() };
      }
      if (endpoint.includes('/dependencies')) {
        return { success: true, data: mockDependencyGraph, timestamp: new Date().toISOString() };
      }
      return { success: false, error: { code: 'NOT_FOUND', message: '' }, timestamp: '' };
    });

    renderIntelligenceView();

    const depsTab = await screen.findByRole('button', { name: /Dependency Graph/i });
    fireEvent.click(depsTab);

    expect(await screen.findByText('Architecture Dependency Map')).toBeInTheDocument();
    expect(await screen.findByText('Internal Modules')).toBeInTheDocument();
    expect(await screen.findByText('src/types/user.ts')).toBeInTheDocument();
  });

  it('opens Ingestion modal, stages files, and triggers analysis run', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: null,
      timestamp: new Date().toISOString(),
    });

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      success: true,
      data: mockAnalysisRun,
      timestamp: new Date().toISOString(),
    });

    renderIntelligenceView();

    const ingestBtn = await screen.findByRole('button', { name: /Ingest Source Code/i });
    fireEvent.click(ingestBtn);

    expect(screen.getByText('Ingest Repository Source Files')).toBeInTheDocument();

    // Load sample TS files
    const loadSampleBtn = screen.getByRole('button', { name: /Load Sample TS Project Files/i });
    fireEvent.click(loadSampleBtn);

    expect(screen.getByText('Staged Batch Files (3)')).toBeInTheDocument();

    // Execute analysis run
    const runBtn = screen.getByRole('button', { name: /Run AST Intelligence Analysis/i });
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        `/repositories/${mockRepository.id}/analysis`,
        expect.objectContaining({
          files: expect.arrayContaining([
            expect.objectContaining({ filePath: 'src/types/auth.ts' }),
          ]),
        }),
      );
    });
  });
});
