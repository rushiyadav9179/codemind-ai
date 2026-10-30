import { useState, type FormEvent } from 'react';
import {
  Sparkles,
  UploadCloud,
  FileCode,
  Box,
  Layers,
  ArrowRight,
  Search,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  Code2,
  GitFork,
  FileText,
  Plus,
} from 'lucide-react';
import {
  useLatestAnalysis,
  useAnalyzedFiles,
  useAnalyzedFileDetail,
  useDependencyGraph,
  useTriggerAnalysis,
} from '../../hooks/useIntelligence';
import { EmptyState } from '../common/EmptyState';
import { LoadingSpinner } from '../common/LoadingSpinner';
import type { Repository } from '../../types';

interface CodeIntelligenceViewProps {
  repository: Repository;
  onBack: () => void;
}

export function CodeIntelligenceView({ repository, onBack }: CodeIntelligenceViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'dependencies'>('overview');
  const [filePage, setFilePage] = useState(1);
  const [fileSearch, setFileSearch] = useState('');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // Ingestion modal state
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [ingestPath, setIngestPath] = useState('');
  const [ingestContent, setIngestContent] = useState('');
  const [stagedFiles, setStagedFiles] = useState<Array<{ filePath: string; content: string }>>([]);
  const [ingestError, setIngestError] = useState<string | null>(null);

  // Queries
  const {
    data: latestRun,
    isLoading: isLoadingRun,
    error: runError,
  } = useLatestAnalysis(repository.id);

  const analysisId = latestRun?.id;

  const { data: filesData, isLoading: isLoadingFiles } = useAnalyzedFiles({
    repositoryId: repository.id,
    analysisId,
    page: filePage,
    limit: 15,
    search: fileSearch || undefined,
  });

  const { data: fileDetail, isLoading: isLoadingDetail } = useAnalyzedFileDetail(
    repository.id,
    analysisId,
    selectedFileId,
  );

  const { data: dependencyGraph, isLoading: isLoadingDeps } = useDependencyGraph(
    repository.id,
    analysisId,
  );

  const triggerMutation = useTriggerAnalysis(repository.id);

  function handleStageFile(e: FormEvent) {
    e.preventDefault();
    setIngestError(null);
    const pathTrimmed = ingestPath.trim();
    if (!pathTrimmed) {
      setIngestError('File path is required');
      return;
    }
    if (!ingestContent) {
      setIngestError('File content cannot be empty');
      return;
    }
    if (stagedFiles.some((f) => f.filePath === pathTrimmed)) {
      setIngestError('File is already staged in this batch');
      return;
    }

    setStagedFiles((prev) => [...prev, { filePath: pathTrimmed, content: ingestContent }]);
    setIngestPath('');
    setIngestContent('');
  }

  function handleRemoveStaged(index: number) {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleLoadSampleFiles() {
    setStagedFiles([
      {
        filePath: 'src/types/auth.ts',
        content: `export interface UserProfile {\n  id: string;\n  email: string;\n  role: 'USER' | 'ADMIN';\n}\n\nexport type SessionToken = string;\n`,
      },
      {
        filePath: 'src/services/auth.service.ts',
        content: `import { UserProfile, SessionToken } from '../types/auth';\nimport axios from 'axios';\n\nexport class AuthService {\n  private token: SessionToken = '';\n\n  public async authenticate(email: string): Promise<UserProfile> {\n    return { id: 'u1', email, role: 'USER' };\n  }\n}\n\nexport function validateEmail(email: string): boolean {\n  return email.includes('@');\n}\n`,
      },
      {
        filePath: 'src/components/LoginForm.tsx',
        content: `import React, { useState } from 'react';\nimport { AuthService, validateEmail } from '../services/auth.service';\n\nexport interface LoginFormProps {\n  onSuccess: () => void;\n}\n\nexport function LoginForm({ onSuccess }: LoginFormProps) {\n  const [email, setEmail] = useState('');\n  return <form>{email}</form>;\n}\n`,
      },
    ]);
  }

  async function handleExecuteAnalysis() {
    if (stagedFiles.length === 0) {
      setIngestError('Add or load at least one file to analyze');
      return;
    }
    try {
      setIngestError(null);
      await triggerMutation.mutateAsync(stagedFiles);
      setStagedFiles([]);
      setIsIngestModalOpen(false);
      setActiveTab('overview');
    } catch (err) {
      setIngestError(err instanceof Error ? err.message : 'Analysis trigger failed');
    }
  }

  const summary = latestRun?.summary;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/50">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-850 hover:bg-white border border-slate-200/70 shadow-2xs transition cursor-pointer"
            aria-label="Back to repositories"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                Code Intelligence Engine
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-medium text-slate-500">{repository.name}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-850 tracking-tight flex items-center gap-2.5">
              {repository.name}
              <span
                className={
                  repository.status === 'ACTIVE' ? 'badge-status-healthy' : 'badge-status-neutral'
                }
              >
                {repository.status.toLowerCase()}
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsIngestModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-accent/25 hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 cursor-pointer"
          >
            <UploadCloud className="h-4 w-4" />
            Ingest Source Code
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200/80">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-3 text-sm font-semibold transition border-b-2 cursor-pointer ${
            activeTab === 'overview'
              ? 'border-accent text-accent'
              : 'border-transparent text-slate-600 hover:text-slate-850'
          }`}
        >
          Overview & Metrics
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('files')}
          className={`pb-3 px-3 text-sm font-semibold transition border-b-2 cursor-pointer ${
            activeTab === 'files'
              ? 'border-accent text-accent'
              : 'border-transparent text-slate-600 hover:text-slate-850'
          }`}
        >
          Analyzed Files ({summary?.totalFiles ?? 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('dependencies')}
          className={`pb-3 px-3 text-sm font-semibold transition border-b-2 cursor-pointer ${
            activeTab === 'dependencies'
              ? 'border-accent text-accent'
              : 'border-transparent text-slate-600 hover:text-slate-850'
          }`}
        >
          Dependency Graph
        </button>
      </div>

      {/* Content based on status */}
      {isLoadingRun ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <LoadingSpinner label="Loading intelligence report..." />
        </div>
      ) : runError ? (
        <div className="card p-8 text-center max-w-lg mx-auto bg-white/95">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mx-auto mb-4 border border-rose-100">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-850 mb-1">
            Failed to load intelligence data
          </h3>
          <p className="text-sm text-slate-600 mb-4">{runError.message}</p>
        </div>
      ) : !latestRun ? (
        <EmptyState
          icon={Sparkles}
          title="No Code Intelligence Available Yet"
          description="Ingest source code files from this repository to extract AST structure, detect functions, classes, interfaces, and resolve intra-repo dependencies."
          action={
            <button
              type="button"
              onClick={() => setIsIngestModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-accent/25 hover:bg-accent-hover cursor-pointer"
            >
              <UploadCloud className="h-4 w-4" />
              Ingest & Analyze Code
            </button>
          }
        />
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && summary && (
            <div className="space-y-6 animate-in fade-in">
              {/* Metric KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card p-5 bg-white/95 border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Files Analyzed
                    </span>
                    <FileCode className="h-4 w-4 text-accent" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-850">{summary.totalFiles}</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {summary.totalCodeLines.toLocaleString()} code lines
                  </div>
                </div>

                <div className="card p-5 bg-white/95 border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Functions
                    </span>
                    <Code2 className="h-4 w-4 text-[#7667C8]" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-850">
                    {summary.totalFunctions}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Exported & internal</div>
                </div>

                <div className="card p-5 bg-white/95 border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Classes & Types
                    </span>
                    <Box className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-850">
                    {summary.totalClasses + summary.totalTypes}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {summary.totalClasses} classes, {summary.totalTypes} interfaces/types
                  </div>
                </div>

                <div className="card p-5 bg-white/95 border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Dependencies
                    </span>
                    <GitFork className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-850">
                    {summary.internalDependencyCount + summary.externalDependencyCount}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {summary.internalDependencyCount} intra-repo, {summary.externalDependencyCount}{' '}
                    npm
                  </div>
                </div>
              </div>

              {/* Languages & Top Dependencies Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card p-6 bg-white/95 shadow-card">
                  <h3 className="text-sm font-bold text-slate-850 mb-4 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-accent" />
                    Language Distribution
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(summary.languages).map(([lang, count]) => {
                      const percentage = Math.round((count / summary.totalFiles) * 100);
                      return (
                        <div key={lang} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-700 capitalize">{lang}</span>
                            <span className="text-slate-500">
                              {count} files ({percentage}%)
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-accent rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="card p-6 bg-white/95 shadow-card">
                  <h3 className="text-sm font-bold text-slate-850 mb-4 flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-blue-600" />
                    External Package Dependencies
                  </h3>
                  {summary.topExternalDependencies.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No external imports found.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {summary.topExternalDependencies.map((dep) => (
                        <div
                          key={dep.name}
                          className="py-2.5 flex items-center justify-between text-xs"
                        >
                          <span className="font-mono font-semibold text-slate-850">{dep.name}</span>
                          <span className="text-slate-500 font-mono">
                            {dep.count} {dep.count === 1 ? 'import' : 'imports'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANALYZED FILES */}
          {activeTab === 'files' && (
            <div className="space-y-6 animate-in fade-in">
              {/* File Search */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={fileSearch}
                    onChange={(e) => {
                      setFileSearch(e.target.value);
                      setFilePage(1);
                    }}
                    placeholder="Filter analyzed files by path..."
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-850 placeholder:text-slate-400 shadow-2xs focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                  {fileSearch && (
                    <button
                      type="button"
                      onClick={() => setFileSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Files Table & Detail split */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className={`${selectedFileId ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
                  <div className="card overflow-hidden bg-white/95 border border-slate-200/80 shadow-2xs">
                    <div className="divide-y divide-slate-100">
                      {isLoadingFiles ? (
                        <div className="p-8 text-center text-slate-400 text-xs">
                          Loading analyzed files...
                        </div>
                      ) : filesData?.items.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs">
                          No matching files found.
                        </div>
                      ) : (
                        filesData?.items.map((file) => (
                          <div
                            key={file.id}
                            onClick={() => setSelectedFileId(file.id)}
                            className={`p-3.5 flex items-center justify-between hover:bg-surface-subtle transition cursor-pointer ${
                              selectedFileId === file.id
                                ? 'bg-[#EAE5FF]/40 border-l-4 border-accent'
                                : ''
                            }`}
                          >
                            <div className="min-w-0 pr-3">
                              <div className="flex items-center gap-2">
                                <FileCode className="h-4 w-4 text-slate-400 shrink-0" />
                                <span className="text-xs font-mono font-bold text-slate-850 truncate">
                                  {file.filePath}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                                <span className="capitalize">{file.language}</span>
                                <span>•</span>
                                <span>{file.lineCount} lines</span>
                                <span>•</span>
                                <span>{file.symbolCount} symbols</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="text-xs font-semibold text-accent hover:underline shrink-0"
                            >
                              Inspect AST
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Pagination */}
                    {filesData && filesData.pagination.totalPages > 1 && (
                      <div className="p-3 bg-surface-subtle/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>
                          Page {filesData.pagination.page} of {filesData.pagination.totalPages}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setFilePage((p) => Math.max(1, p - 1))}
                            disabled={!filesData.pagination.hasPrevPage}
                            className="p-1 rounded bg-white border border-slate-200 disabled:opacity-40 cursor-pointer"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setFilePage((p) => p + 1)}
                            disabled={!filesData.pagination.hasNextPage}
                            className="p-1 rounded bg-white border border-slate-200 disabled:opacity-40 cursor-pointer"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* File Detail Pane */}
                {selectedFileId && (
                  <div className="lg:col-span-5 card p-5 bg-white/95 border border-slate-200/80 shadow-card space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold font-mono text-slate-850 truncate">
                          {fileDetail?.filePath}
                        </h4>
                        <p className="text-[11px] text-slate-400">AST Structural Metadata</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFileId(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {isLoadingDetail ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        Extracting AST details...
                      </div>
                    ) : fileDetail ? (
                      <div className="space-y-4 text-xs">
                        {/* Functions */}
                        <div>
                          <div className="font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                            <Code2 className="h-3.5 w-3.5 text-accent" />
                            Functions & Methods ({fileDetail.symbols.functions.length})
                          </div>
                          {fileDetail.symbols.functions.length === 0 ? (
                            <p className="text-slate-400 italic">None detected</p>
                          ) : (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                              {fileDetail.symbols.functions.map((fn, i) => (
                                <div
                                  key={i}
                                  className="p-2 rounded-lg bg-surface-subtle font-mono text-[11px] flex items-center justify-between"
                                >
                                  <span className="font-bold text-slate-850">
                                    {fn.name}({fn.parameters.join(', ')})
                                  </span>
                                  <span className="text-slate-400 text-[10px]">L{fn.line}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Classes */}
                        <div>
                          <div className="font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                            <Box className="h-3.5 w-3.5 text-emerald-600" />
                            Classes ({fileDetail.symbols.classes.length})
                          </div>
                          {fileDetail.symbols.classes.length === 0 ? (
                            <p className="text-slate-400 italic">None detected</p>
                          ) : (
                            <div className="space-y-2">
                              {fileDetail.symbols.classes.map((cls, i) => (
                                <div
                                  key={i}
                                  className="p-2 rounded-lg bg-surface-subtle text-[11px]"
                                >
                                  <div className="font-bold font-mono text-slate-850">
                                    class {cls.name}
                                    {cls.extends && ` extends ${cls.extends}`}
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-1">
                                    {cls.methods.length} methods, {cls.properties.length} properties
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Types & Interfaces */}
                        <div>
                          <div className="font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-blue-600" />
                            Interfaces & Types ({fileDetail.symbols.types.length})
                          </div>
                          {fileDetail.symbols.types.length === 0 ? (
                            <p className="text-slate-400 italic">None detected</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {fileDetail.symbols.types.map((t, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-md bg-surface-subtle font-mono text-[10px] font-semibold text-slate-700"
                                >
                                  {t.kind} {t.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Dependencies */}
                        <div>
                          <div className="font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                            <GitFork className="h-3.5 w-3.5 text-purple-600" />
                            Intra-Repo Dependencies ({fileDetail.dependencies.length})
                          </div>
                          {fileDetail.dependencies.length === 0 ? (
                            <p className="text-slate-400 italic">No relative imports</p>
                          ) : (
                            <div className="space-y-1">
                              {fileDetail.dependencies.map((dep, i) => (
                                <div
                                  key={i}
                                  className="font-mono text-[10px] text-slate-600 bg-surface-subtle/80 p-1.5 rounded"
                                >
                                  → {dep}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DEPENDENCY GRAPH */}
          {activeTab === 'dependencies' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="card p-6 bg-white/95 shadow-card space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-850">
                      Architecture Dependency Map
                    </h3>
                    <p className="text-xs text-slate-500">
                      Resolved dependency connections between files and external libraries
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                      Internal Modules
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                      External npm packages
                    </span>
                  </div>
                </div>

                {isLoadingDeps ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Constructing dependency graph...
                  </div>
                ) : dependencyGraph?.edges.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 italic">
                    No import connections discovered in this repository.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto">
                    {dependencyGraph?.edges.map((edge, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl border border-slate-200/70 bg-surface-subtle flex items-center justify-between text-xs"
                      >
                        <span className="font-mono font-semibold text-slate-850 truncate max-w-[45%]">
                          {edge.source}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0 mx-2" />
                        <span
                          className={`font-mono truncate max-w-[45%] ${
                            edge.isExternal
                              ? 'text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200'
                              : 'text-accent font-semibold'
                          }`}
                        >
                          {edge.target.replace('ext:', '')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Ingestion Modal */}
      {isIngestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="card w-full max-w-2xl p-6 sm:p-8 bg-white shadow-xl relative animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-accent-muted flex items-center justify-center text-accent">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-850">
                    Ingest Repository Source Files
                  </h3>
                  <p className="text-xs text-slate-500">
                    Add JavaScript/TypeScript files for AST parsing and intelligence extraction
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsIngestModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {ingestError && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{ingestError}</span>
              </div>
            )}

            <div className="flex items-center justify-between bg-accent-muted/40 p-3 rounded-xl border border-accent/20 mb-4">
              <span className="text-xs text-slate-600">
                Want to try with ready-to-analyze code?
              </span>
              <button
                type="button"
                onClick={handleLoadSampleFiles}
                className="text-xs font-bold text-accent hover:underline cursor-pointer"
              >
                Load Sample TS Project Files
              </button>
            </div>

            {/* Stage File Form */}
            <form onSubmit={handleStageFile} className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  File Path (relative)
                </label>
                <input
                  type="text"
                  value={ingestPath}
                  onChange={(e) => setIngestPath(e.target.value)}
                  placeholder="e.g. src/services/calculator.ts"
                  className="w-full rounded-xl border border-slate-200 bg-surface-subtle px-3.5 py-2 text-xs font-mono text-slate-850 placeholder:text-slate-400 focus:border-accent focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Source Code Content
                </label>
                <textarea
                  rows={4}
                  value={ingestContent}
                  onChange={(e) => setIngestContent(e.target.value)}
                  placeholder="Paste TS/JS file contents here..."
                  className="w-full rounded-xl border border-slate-200 bg-surface-subtle px-3.5 py-2 text-xs font-mono text-slate-850 placeholder:text-slate-400 focus:border-accent focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Stage File
                </button>
              </div>
            </form>

            {/* Staged files list */}
            <div className="mb-6">
              <h4 className="text-xs font-bold text-slate-700 mb-2">
                Staged Batch Files ({stagedFiles.length})
              </h4>
              {stagedFiles.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                  No files staged yet.
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200/80">
                  {stagedFiles.map((file, i) => (
                    <div
                      key={i}
                      className="p-2.5 flex items-center justify-between text-xs bg-surface-subtle"
                    >
                      <span className="font-mono font-medium text-slate-850">{file.filePath}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveStaged(i)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsIngestModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAnalysis}
                disabled={triggerMutation.isPending || stagedFiles.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-accent/25 hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
              >
                {triggerMutation.isPending && <LoadingSpinner size="sm" />}
                Run AST Intelligence Analysis ({stagedFiles.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
