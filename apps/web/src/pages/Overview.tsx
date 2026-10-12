import { useApiHealth } from '../hooks/useApiHealth';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Cpu,
  Clock,
  Terminal,
  Database,
  Server,
} from 'lucide-react';
import { cn } from '../lib/utils';

function StatusIcon({ status }: { status: 'healthy' | 'degraded' | 'unhealthy' | undefined }) {
  if (!status) return null;
  const configs = {
    healthy: { icon: CheckCircle, color: 'text-emerald-400' },
    degraded: { icon: AlertTriangle, color: 'text-amber-400' },
    unhealthy: { icon: XCircle, color: 'text-red-400' },
  };
  const { icon: Icon, color } = configs[status];
  return <Icon className={cn('h-5 w-5', color)} aria-hidden="true" />;
}

function ServiceBadge({ name, status }: { name: string; status?: string }) {
  const isUp = status === 'up';
  const isDown = status === 'down';
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-400">{name}</span>
      <span
        className={cn(
          'badge text-xs',
          isUp && 'badge-status-healthy',
          isDown && 'badge-status-error',
          !isUp && !isDown && 'bg-gray-800 text-gray-500 border border-gray-700',
        )}
      >
        {status ?? 'unconfigured'}
      </span>
    </div>
  );
}

export function Overview() {
  const { data: health, isLoading, isError, error } = useApiHealth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" label="Loading system status..." />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-100">Platform Overview</h2>
        <p className="text-sm text-gray-400 mt-1">
          Current system status and platform health — Phase 1 Foundation
        </p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-indigo-400" aria-hidden="true" />
            <h3 className="text-base font-semibold text-gray-100">API Status</h3>
          </div>
          {health && <StatusIcon status={health.status} />}
        </div>

        {isError && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-950/50 border border-red-800/50">
            <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-300 font-medium">API is unreachable</p>
              <p className="text-xs text-red-400 mt-0.5">
                {error instanceof Error
                  ? error.message
                  : 'Start the API server with: npm run dev:api'}
              </p>
            </div>
          </div>
        )}

        {health && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg bg-gray-800/50 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="h-4 w-4 text-indigo-400" />
                <span className="text-xs text-gray-400 uppercase tracking-wide">Status</span>
              </div>
              <p
                className={cn(
                  'text-lg font-semibold capitalize',
                  health.status === 'healthy' ? 'text-emerald-400' : 'text-amber-400',
                )}
              >
                {health.status}
              </p>
            </div>

            <div className="rounded-lg bg-gray-800/50 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Terminal className="h-4 w-4 text-indigo-400" />
                <span className="text-xs text-gray-400 uppercase tracking-wide">Version</span>
              </div>
              <p className="text-lg font-semibold text-gray-100 font-mono">{health.version}</p>
            </div>

            <div className="rounded-lg bg-gray-800/50 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-indigo-400" />
                <span className="text-xs text-gray-400 uppercase tracking-wide">Uptime</span>
              </div>
              <p className="text-lg font-semibold text-gray-100">{health.uptime}s</p>
            </div>

            <div className="rounded-lg bg-gray-800/50 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Terminal className="h-4 w-4 text-indigo-400" />
                <span className="text-xs text-gray-400 uppercase tracking-wide">Environment</span>
              </div>
              <p className="text-lg font-semibold text-gray-100 capitalize">{health.environment}</p>
            </div>
          </div>
        )}
      </div>

      {health && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-5 w-5 text-indigo-400" aria-hidden="true" />
            <h3 className="text-base font-semibold text-gray-100">Services</h3>
          </div>
          <div className="divide-y divide-gray-800">
            <ServiceBadge name="API Server" status={health.services?.api} />
            <ServiceBadge name="PostgreSQL + pgvector" status={health.services?.database} />
            <ServiceBadge name="Redis" status={health.services?.redis} />
          </div>
          <p className="text-xs text-gray-600 mt-3">
            Services marked &quot;unconfigured&quot; require Docker. Run{' '}
            <code className="text-gray-500 font-mono">docker compose up -d</code> after installing
            Docker Desktop.
          </p>
        </div>
      )}

      <div className="card">
        <h3 className="text-base font-semibold text-gray-100 mb-4">Upcoming Features</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Repository Analysis', phase: 'Phase 2' },
            { label: 'RAG-powered Q&A', phase: 'Phase 3' },
            { label: 'Code Reviews', phase: 'Phase 4' },
            { label: 'Test Generation', phase: 'Phase 5' },
            { label: 'Documentation AI', phase: 'Phase 5' },
            { label: 'Ollama Integration', phase: 'Phase 2' },
          ].map((f) => (
            <div
              key={f.label}
              className="flex items-center justify-between rounded-lg bg-gray-800/40 px-4 py-3 border border-gray-800"
            >
              <span className="text-sm text-gray-300">{f.label}</span>
              <span className="badge-coming-soon">{f.phase}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
