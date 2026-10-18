import { useState, type FormEvent } from 'react';
import {
  FolderGit2,
  Plus,
  Search,
  GitBranch,
  Calendar,
  Code2,
  Pencil,
  Trash2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  useRepositories,
  useCreateRepository,
  useUpdateRepository,
  useDeleteRepository,
} from '../hooks/useRepositories';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { Repository, RepositoryStatus } from '../types';

export function Repositories() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRepo, setEditingRepo] = useState<Repository | null>(null);
  const [deletingRepo, setDeletingRepo] = useState<Repository | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formBranch, setFormBranch] = useState('main');
  const [formLanguage, setFormLanguage] = useState('');
  const [formStatus, setFormStatus] = useState<RepositoryStatus>('ACTIVE');
  const [formError, setFormError] = useState<string | null>(null);

  // Queries & Mutations
  const {
    data: paginatedData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useRepositories({
    page,
    limit: 8,
    search: debouncedSearch || undefined,
  });

  const createMutation = useCreateRepository();
  const updateMutation = useUpdateRepository();
  const deleteMutation = useDeleteRepository();

  const repositories = paginatedData?.items ?? [];
  const pagination = paginatedData?.pagination;

  // Search input change
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearch(val);
    setDebouncedSearch(val.trim());
    setPage(1);
  }

  // Open Create Modal
  function handleOpenCreate() {
    setFormName('');
    setFormDescription('');
    setFormBranch('main');
    setFormLanguage('');
    setFormError(null);
    setIsCreateOpen(true);
  }

  // Open Edit Modal
  function handleOpenEdit(repo: Repository) {
    setEditingRepo(repo);
    setFormName(repo.name);
    setFormDescription(repo.description ?? '');
    setFormBranch(repo.defaultBranch);
    setFormLanguage(repo.language ?? '');
    setFormStatus(repo.status);
    setFormError(null);
  }

  // Submit Create
  async function handleCreateSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const trimmedName = formName.trim();
    if (!trimmedName) {
      setFormError('Repository name is required');
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(trimmedName)) {
      setFormError('Name can only contain letters, numbers, hyphens, periods, or underscores');
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: trimmedName,
        description: formDescription.trim() || null,
        defaultBranch: formBranch.trim() || 'main',
        language: formLanguage.trim() || null,
      });
      setIsCreateOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create repository');
    }
  }

  // Submit Edit
  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editingRepo) return;
    setFormError(null);

    const trimmedName = formName.trim();
    if (!trimmedName) {
      setFormError('Repository name cannot be empty');
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(trimmedName)) {
      setFormError('Name can only contain letters, numbers, hyphens, periods, or underscores');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: editingRepo.id,
        input: {
          name: trimmedName,
          description: formDescription.trim() || null,
          defaultBranch: formBranch.trim() || 'main',
          language: formLanguage.trim() || null,
          status: formStatus,
        },
      });
      setEditingRepo(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update repository');
    }
  }

  // Submit Delete
  async function handleDeleteConfirm() {
    if (!deletingRepo) return;
    try {
      await deleteMutation.mutateAsync(deletingRepo.id);
      setDeletingRepo(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to delete repository');
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-200/50">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-muted border border-accent/20 text-[#6756B8] text-xs font-semibold mb-3">
            <ShieldCheck className="h-3.5 w-3.5" />
            Phase 3 — Repository Management
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-850 tracking-tight">
            Repositories
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-1.5 max-w-2xl leading-relaxed">
            Manage codebases configured for AI architecture inspection, code reviews, and
            intelligence analysis.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent/25 transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Repository
          </button>
        </div>
      </div>

      {/* Search Bar & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search repositories by name or description..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-850 placeholder:text-slate-400 shadow-2xs transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setDebouncedSearch('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {pagination && pagination.totalItems > 0 && (
          <div className="text-xs font-medium text-slate-500">
            {pagination.totalItems} {pagination.totalItems === 1 ? 'repository' : 'repositories'}{' '}
            registered
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="card p-6 space-y-4 animate-pulse bg-white/70 border border-slate-200/60"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-40 bg-slate-200 rounded-md" />
                <div className="h-5 w-16 bg-slate-200 rounded-full" />
              </div>
              <div className="h-4 w-3/4 bg-slate-100 rounded-md" />
              <div className="flex gap-4 pt-2">
                <div className="h-4 w-20 bg-slate-100 rounded-md" />
                <div className="h-4 w-24 bg-slate-100 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="card p-8 text-center max-w-lg mx-auto bg-white/95">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mx-auto mb-4 border border-rose-100">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-850 mb-1">Failed to load repositories</h3>
          <p className="text-sm text-slate-600 mb-6">
            {error?.message || 'Please try again later'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      ) : repositories.length === 0 ? (
        <EmptyState
          icon={FolderGit2}
          title={debouncedSearch ? 'No matching repositories' : 'No repositories connected yet'}
          description={
            debouncedSearch
              ? `No repositories found matching "${debouncedSearch}". Try a different search term.`
              : 'Add your first repository to begin tracking code intelligence, repository metrics, and automated code review workflows.'
          }
          action={
            debouncedSearch ? (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setDebouncedSearch('');
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
              >
                Clear search
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-accent/25 hover:bg-accent-hover cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Your First Repository
              </button>
            )
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {repositories.map((repo) => (
              <div
                key={repo.id}
                className="card p-6 flex flex-col justify-between hover:border-slate-300/90 transition-all bg-white/95 group shadow-card"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-muted border border-accent/20 text-accent">
                        <FolderGit2 className="h-4 w-4" />
                      </div>
                      <h3 className="text-base font-bold text-slate-850 truncate tracking-tight">
                        {repo.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={
                          repo.status === 'ACTIVE' ? 'badge-status-healthy' : 'badge-status-neutral'
                        }
                      >
                        {repo.status.toLowerCase()}
                      </span>
                      <span className="badge-status-neutral uppercase font-mono">
                        {repo.sourceType.toLowerCase()}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 line-clamp-2 min-h-[2.5rem] mb-4">
                    {repo.description || (
                      <span className="text-slate-400 italic">No description provided</span>
                    )}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    {repo.language && (
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                        <Code2 className="h-3.5 w-3.5 text-slate-400" />
                        {repo.language}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-slate-500 font-mono">
                      <GitBranch className="h-3.5 w-3.5 text-slate-400" />
                      {repo.defaultBranch}
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1 text-slate-400">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(repo.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(repo)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      title="Edit repository"
                      aria-label={`Edit ${repo.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingRepo(repo)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Delete repository"
                      aria-label={`Delete ${repo.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200/60">
              <span className="text-xs text-slate-500">
                Page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} total)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!pagination.hasPrevPage || isFetching}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!pagination.hasNextPage || isFetching}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="card w-full max-w-lg p-6 sm:p-8 bg-white shadow-xl relative animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-accent-muted flex items-center justify-center text-accent">
                  <FolderGit2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-850">Add Repository</h3>
                  <p className="text-xs text-slate-500">
                    Register a codebase for analysis and intelligence
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="repo-name"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Repository Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="repo-name"
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. backend-api or core-platform"
                  className="w-full rounded-xl border border-slate-200 bg-surface-subtle px-3.5 py-2 text-sm text-slate-850 placeholder:text-slate-400 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Letters, numbers, hyphens, periods, or underscores only.
                </p>
              </div>

              <div>
                <label
                  htmlFor="repo-description"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Description (optional)
                </label>
                <textarea
                  id="repo-description"
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Briefly describe what this repository does..."
                  className="w-full rounded-xl border border-slate-200 bg-surface-subtle px-3.5 py-2 text-sm text-slate-850 placeholder:text-slate-400 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="repo-language"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Primary Language
                  </label>
                  <input
                    id="repo-language"
                    type="text"
                    value={formLanguage}
                    onChange={(e) => setFormLanguage(e.target.value)}
                    placeholder="e.g. TypeScript, Python, Go"
                    className="w-full rounded-xl border border-slate-200 bg-surface-subtle px-3.5 py-2 text-sm text-slate-850 placeholder:text-slate-400 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="repo-branch"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Default Branch
                  </label>
                  <input
                    id="repo-branch"
                    type="text"
                    value={formBranch}
                    onChange={(e) => setFormBranch(e.target.value)}
                    placeholder="main"
                    className="w-full rounded-xl border border-slate-200 bg-surface-subtle px-3.5 py-2 text-sm text-slate-850 placeholder:text-slate-400 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-accent/25 hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
                >
                  {createMutation.isPending && <LoadingSpinner size="sm" />}
                  Create Repository
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingRepo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="card w-full max-w-lg p-6 sm:p-8 bg-white shadow-xl relative animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-accent-muted flex items-center justify-center text-accent">
                  <Pencil className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-850">Edit Repository</h3>
                  <p className="text-xs text-slate-500">Update repository metadata and settings</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRepo(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="edit-repo-name"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Repository Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="edit-repo-name"
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-surface-subtle px-3.5 py-2 text-sm text-slate-850 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-repo-description"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Description
                </label>
                <textarea
                  id="edit-repo-description"
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-surface-subtle px-3.5 py-2 text-sm text-slate-850 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="edit-repo-language"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Language
                  </label>
                  <input
                    id="edit-repo-language"
                    type="text"
                    value={formLanguage}
                    onChange={(e) => setFormLanguage(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-surface-subtle px-3.5 py-2 text-sm text-slate-850 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-repo-branch"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Default Branch
                  </label>
                  <input
                    id="edit-repo-branch"
                    type="text"
                    value={formBranch}
                    onChange={(e) => setFormBranch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-surface-subtle px-3.5 py-2 text-sm text-slate-850 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-repo-status"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Status
                  </label>
                  <select
                    id="edit-repo-status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as RepositoryStatus)}
                    className="w-full rounded-xl border border-slate-200 bg-surface-subtle px-3 py-2 text-sm text-slate-850 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRepo(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-accent/25 hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
                >
                  {updateMutation.isPending && <LoadingSpinner size="sm" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRepo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="card w-full max-w-md p-6 bg-white shadow-xl relative animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-850">Delete Repository</h3>
                <p className="text-xs text-slate-500">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-slate-850">{deletingRepo.name}</span>? All
              associated repository metadata and historical review data will be permanently removed.
            </p>

            {formError && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingRepo(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-rose-600/25 hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {deleteMutation.isPending && <LoadingSpinner size="sm" />}
                Delete Repository
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
