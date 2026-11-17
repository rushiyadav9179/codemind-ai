import { useState, type KeyboardEvent } from 'react';
import {
  ChevronLeft,
  Search,
  AlertCircle,
  Loader2,
  DatabaseZap,
  FileCode,
  ExternalLink,
} from 'lucide-react';
import { useIndexStatus, useTriggerIndex, useSemanticSearch } from '../../hooks/useSearch';
import { LoadingSpinner } from '../common/LoadingSpinner';
import type { Repository, SearchResult } from '../../types';

interface SemanticSearchViewProps {
  repository: Repository;
  onBack: () => void;
}

const KIND_BADGE: Record<string, string> = {
  function: 'bg-purple-100 text-purple-700',
  method: 'bg-indigo-100 text-indigo-700',
  class: 'bg-blue-100 text-blue-700',
  interface: 'bg-green-100 text-green-700',
  type: 'bg-amber-100 text-amber-700',
};

function kindBadgeClass(kind: string): string {
  return KIND_BADGE[kind.toLowerCase()] ?? 'bg-stone-100 text-stone-600';
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(Math.min(Math.max(score, 0), 1) * 100);
  const color = pct >= 80 ? 'bg-violet-500' : pct >= 55 ? 'bg-blue-400' : 'bg-stone-300';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-stone-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-mono text-stone-500">{(score * 100).toFixed(0)}%</span>
    </div>
  );
}

function ResultCard({ result }: { result: SearchResult }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 space-y-2">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${kindBadgeClass(result.unitKind)}`}
            >
              {result.unitKind}
            </span>
            <span className="text-sm font-bold text-stone-800 font-mono truncate">
              {result.unitName}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-stone-500">
            <FileCode className="h-3 w-3 shrink-0" />
            <span className="font-mono truncate">{result.filePath}</span>
            <span>·</span>
            <span>
              L{result.startLine}–{result.endLine}
            </span>
          </div>
        </div>
        <ScoreBar score={result.score} />
      </div>

      {result.contentPreview && (
        <pre className="text-[11px] font-mono text-stone-600 bg-stone-50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed border border-stone-100">
          {result.contentPreview}
        </pre>
      )}
    </div>
  );
}

function OllamaSetupGuide() {
  return (
    <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-stone-800">Embedding Model Unavailable</h3>
          <p className="text-xs text-stone-500">Ollama is required to generate code embeddings</p>
        </div>
      </div>

      <p className="text-sm text-stone-600 mb-4 leading-relaxed">
        Semantic search uses local embeddings via{' '}
        <span className="font-semibold text-stone-800">Ollama</span>. Please install Ollama and pull
        a compatible embedding model to enable this feature.
      </p>

      <ol className="space-y-2 text-sm text-stone-700 mb-5">
        <li className="flex gap-2">
          <span className="shrink-0 font-bold text-violet-600">1.</span>
          <span>
            Install Ollama from{' '}
            <a
              href="https://ollama.com"
              target="_blank"
              rel="noreferrer"
              className="text-violet-600 hover:underline inline-flex items-center gap-1"
            >
              ollama.com <ExternalLink className="h-3 w-3" />
            </a>
          </span>
        </li>
        <li className="flex gap-2">
          <span className="shrink-0 font-bold text-violet-600">2.</span>
          <span>
            Pull an embedding model:{' '}
            <code className="bg-stone-100 px-1.5 py-0.5 rounded text-xs font-mono">
              ollama pull nomic-embed-text
            </code>
          </span>
        </li>
        <li className="flex gap-2">
          <span className="shrink-0 font-bold text-violet-600">3.</span>
          <span>
            Ensure the Ollama server is running:{' '}
            <code className="bg-stone-100 px-1.5 py-0.5 rounded text-xs font-mono">
              ollama serve
            </code>
          </span>
        </li>
        <li className="flex gap-2">
          <span className="shrink-0 font-bold text-violet-600">4.</span>
          <span>Return here and click "Index Repository" to begin indexing.</span>
        </li>
      </ol>

      <div className="rounded-xl bg-[#EAE5FF]/60 border border-violet-200/60 p-3 text-xs text-violet-800">
        By default, CodeMind uses <strong>nomic-embed-text</strong> (768-dim). You may configure a
        different model in the server settings.
      </div>
    </div>
  );
}

export function SemanticSearchView({ repository, onBack }: SemanticSearchViewProps) {
  const [query, setQuery] = useState('');
  const [showOllamaGuide, setShowOllamaGuide] = useState(false);

  const { data: indexStatus, isLoading: isLoadingStatus } = useIndexStatus(repository.id);
  const triggerIndex = useTriggerIndex(repository.id);
  const semanticSearch = useSemanticSearch(repository.id);

  async function handleIndex() {
    setShowOllamaGuide(false);
    try {
      await triggerIndex.mutateAsync();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('MODEL_UNAVAILABLE') || msg.toLowerCase().includes('model')) {
        setShowOllamaGuide(true);
      }
    }
  }

  function handleSearch() {
    const q = query.trim();
    if (!q) return;
    semanticSearch.mutate(q);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSearch();
  }

  const results: SearchResult[] = semanticSearch.data ?? [];
  const isIndexed = indexStatus?.status === 'indexed';
  const isIndexing = indexStatus?.status === 'indexing' || triggerIndex.isPending;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
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
                Semantic Code Search
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
      </div>

      {/* Index Status Banner */}
      {!isLoadingStatus && indexStatus && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <DatabaseZap
              className={`h-4 w-4 shrink-0 ${
                isIndexed
                  ? 'text-violet-600'
                  : isIndexing
                    ? 'text-blue-500 animate-pulse'
                    : 'text-stone-400'
              }`}
            />
            <div>
              <span className="text-xs font-semibold text-stone-700">
                {isIndexed
                  ? `Index ready — ${indexStatus.indexedUnits} units indexed`
                  : isIndexing
                    ? 'Indexing in progress…'
                    : 'Repository not indexed'}
              </span>
              {isIndexed && indexStatus.embeddingModel && (
                <span className="ml-2 text-[11px] text-stone-400 font-mono">
                  ({indexStatus.embeddingModel})
                </span>
              )}
            </div>
          </div>
          {!isIndexed && !isIndexing && (
            <button
              type="button"
              onClick={handleIndex}
              disabled={triggerIndex.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {triggerIndex.isPending && <LoadingSpinner size="sm" />}
              Index Repository
            </button>
          )}
        </div>
      )}

      {/* Main Content */}
      {isLoadingStatus ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <LoadingSpinner label="Checking index status…" />
        </div>
      ) : showOllamaGuide ? (
        <div className="space-y-4">
          <OllamaSetupGuide />
        </div>
      ) : triggerIndex.error && !showOllamaGuide ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 flex items-center gap-3 text-sm text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>
            {triggerIndex.error instanceof Error ? triggerIndex.error.message : 'Indexing failed'}
          </span>
        </div>
      ) : isIndexing ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
          <Loader2 className="h-10 w-10 text-violet-500 animate-spin" />
          <div className="text-center">
            <p className="text-sm font-semibold text-stone-700">Indexing in progress…</p>
            <p className="text-xs text-stone-500 mt-1">
              Generating embeddings for all code units. This may take a moment.
            </p>
          </div>
        </div>
      ) : !isIndexed ? (
        <div className="flex flex-col items-center justify-center min-h-[360px] gap-6 text-center">
          <div className="h-16 w-16 rounded-2xl bg-[#EAE5FF] border border-violet-200 flex items-center justify-center text-violet-600">
            <DatabaseZap className="h-8 w-8" />
          </div>
          <div className="max-w-md">
            <h3 className="text-lg font-bold text-stone-800 mb-2">Repository Not Indexed</h3>
            <p className="text-sm text-stone-500 leading-relaxed">
              Indexing generates vector embeddings for every function, class, method, and type in
              this repository — enabling you to find code by meaning rather than by keyword.
            </p>
          </div>
          <button
            type="button"
            onClick={handleIndex}
            disabled={triggerIndex.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 text-sm font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            {triggerIndex.isPending ? (
              <>
                <LoadingSpinner size="sm" />
                Starting…
              </>
            ) : (
              <>
                <DatabaseZap className="h-4 w-4" />
                Index Repository
              </>
            )}
          </button>
          <p className="text-xs text-stone-400 max-w-sm">
            Requires{' '}
            <button
              type="button"
              onClick={() => setShowOllamaGuide(true)}
              className="text-violet-600 hover:underline cursor-pointer"
            >
              Ollama
            </button>{' '}
            with an embedding model running locally.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what you're looking for… e.g. 'authentication middleware'"
                className="w-full rounded-xl border border-stone-200 bg-white pl-10 pr-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200 transition"
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              disabled={semanticSearch.isPending || !query.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {semanticSearch.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </button>
          </div>

          {/* Search Error */}
          {semanticSearch.isError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 flex items-center gap-2 text-sm text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>
                {semanticSearch.error instanceof Error
                  ? semanticSearch.error.message
                  : 'Search failed'}
              </span>
            </div>
          )}

          {/* Results */}
          {semanticSearch.isPending ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <LoadingSpinner label="Searching codebase…" />
            </div>
          ) : semanticSearch.isSuccess && results.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[240px] gap-3 text-center">
              <div className="h-12 w-12 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400">
                <Search className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-stone-600">No matching code found</p>
              <p className="text-xs text-stone-400 max-w-xs">
                Try rephrasing your query or use different keywords to describe the code you're
                looking for.
              </p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-stone-500">
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </p>
              {results.map((r) => (
                <ResultCard key={r.id} result={r} />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
