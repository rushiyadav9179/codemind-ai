import { useApiHealth } from '../hooks/useApiHealth';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
  Clock,
  Terminal,
  Database,
  Server,
  Layers,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '../lib/utils';

function StatusIcon({ status }: { status: 'healthy' | 'degraded' | 'unhealthy' | undefined }) {
  if (!status) return null;
  const configs = {
    healthy: { icon: CheckCircle2, color: 'text-[#1E6B43]' },
    degraded: { icon: AlertTriangle, color: 'text-amber-600' },
    unhealthy: { icon: XCircle, color: 'text-rose-600' },
  };
  const { icon: Icon, color } = configs[status];
  return <Icon className={cn('h-5 w-5', color)} aria-hidden="true" />;
}

function ServiceBadge({ name, status }: { name: string; status?: string }) {
  const isUp = status === 'up';
  const isDown = status === 'down';
  return (
    <div className="flex items-center justify-between py-3.5 px-1 group transition-colors">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'h-2 w-2 rounded-full',
            isUp && 'bg-[#1E6B43] shadow-[0_0_8px_rgba(30,107,67,0.35)]',
            isDown && 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.35)]',
            !isUp && !isDown && 'bg-slate-300',
          )}
        />
        <span className="text-sm font-medium text-slate-850">{name}</span>
      </div>
      <span
        className={cn(
          'text-xs uppercase tracking-wider font-semibold font-mono',
          isUp && 'badge-status-healthy',
          isDown && 'badge-status-error',
          !isUp && !isDown && 'badge-status-neutral',
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
      <div className="flex items-center justify-center min-h-[350px]">
        <LoadingSpinner size="lg" label="Connecting to platform services..." />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Hero Welcome & Hierarchy Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-200/50">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-muted border border-accent/20 text-[#6756B8] text-xs font-semibold mb-3">
            <ShieldCheck className="h-3.5 w-3.5" />
            Phase 1 Foundation Operational
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-850 tracking-tight">
            Platform Overview
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-1.5 max-w-2xl leading-relaxed">
            Real-time status of backend orchestrators, foundational services, and intelligence
            architecture.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1E6B43]" />
          </span>
          Live Health Polling (30s)
        </div>
      </div>

      {/* Primary Status Card */}
      <div className="card relative overflow-hidden bg-white/90 backdrop-blur-xs">
        {/* Subtle decorative gradient top border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#7667C8] via-[#EAE5FF] to-[#E3EEFF]" />

        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent-muted flex items-center justify-center text-[#7667C8]">
              <Server className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-850 tracking-tight">API Core Engine</h3>
              <p className="text-xs text-slate-500">
                Node.js • Express 5 • Zod Type-Safe Validation
              </p>
            </div>
          </div>
          {health && <StatusIcon status={health.status} />}
        </div>

        {isError && (
          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-rose-50 border border-rose-200">
            <XCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-900">API Connection Offline</p>
              <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                {error instanceof Error
                  ? error.message
                  : 'Backend server is unreachable. Run npm run dev:api to launch the local API service.'}
              </p>
            </div>
          </div>
        )}

        {health && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl bg-surface-subtle/80 border border-slate-200/50 p-4 transition-all hover:bg-white hover:border-slate-300">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="h-4 w-4 text-[#7667C8]" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Health State
                </span>
              </div>
              <p
                className={cn(
                  'text-xl font-bold capitalize tracking-tight',
                  health.status === 'healthy' ? 'text-[#1E6B43]' : 'text-amber-600',
                )}
              >
                {health.status}
              </p>
            </div>

            <div className="rounded-xl bg-surface-subtle/80 border border-slate-200/50 p-4 transition-all hover:bg-white hover:border-slate-300">
              <div className="flex items-center gap-2 mb-2">
                <Terminal className="h-4 w-4 text-[#7667C8]" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Core Version
                </span>
              </div>
              <p className="text-xl font-bold text-slate-850 font-mono tracking-tight">
                {health.version}
              </p>
            </div>

            <div className="rounded-xl bg-surface-subtle/80 border border-slate-200/50 p-4 transition-all hover:bg-white hover:border-slate-300">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-[#7667C8]" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Process Uptime
                </span>
              </div>
              <p className="text-xl font-bold text-slate-850 tracking-tight font-mono">
                {health.uptime}s
              </p>
            </div>

            <div className="rounded-xl bg-surface-subtle/80 border border-slate-200/50 p-4 transition-all hover:bg-white hover:border-slate-300">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="h-4 w-4 text-[#7667C8]" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Environment
                </span>
              </div>
              <p className="text-xl font-bold text-slate-850 capitalize tracking-tight">
                {health.environment}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Grid: Connected Infrastructure & Upcoming Capabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Connected Services List */}
        <div className="lg:col-span-5 card h-fit">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
            <div className="h-9 w-9 rounded-xl bg-surface-subtle flex items-center justify-center text-slate-700">
              <Database className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-850 tracking-tight">
                Service Topology
              </h3>
              <p className="text-xs text-slate-500">Docker Infrastructure Dependencies</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            <ServiceBadge name="Express API Service" status={health?.services?.api} />
            <ServiceBadge name="PostgreSQL 16 (pgvector)" status={health?.services?.database} />
            <ServiceBadge name="Redis 7 (BullMQ Broker)" status={health?.services?.redis} />
          </div>

          <div className="mt-5 p-3.5 rounded-xl bg-amber-light/50 border border-amber-border/70 text-xs text-amber-text leading-relaxed">
            <span className="font-semibold block mb-0.5">Note on Local Services:</span>
            Containers marked <code className="font-mono text-[11px] font-bold">
              unconfigured
            </code>{' '}
            run via Docker. Execute{' '}
            <code className="font-mono font-bold">docker compose up -d</code> once Docker Desktop is
            running.
          </div>
        </div>

        {/* Upcoming Platform Capabilities */}
        <div className="lg:col-span-7 card">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-850 tracking-tight">
                Planned AI Capabilities
              </h3>
              <p className="text-xs text-slate-500">Upcoming engineering milestones (Phases 2–5)</p>
            </div>
            <span className="text-xs font-semibold text-slate-400">Roadmap</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {[
              {
                label: 'GitHub OAuth & Repo Ingestion',
                phase: 'Phase 2',
                desc: 'Git tree parsing & token analysis',
              },
              {
                label: 'Local Ollama LLM Runtime',
                phase: 'Phase 2',
                desc: 'Zero-cost local model inference',
              },
              {
                label: 'pgvector Semantic Code Search',
                phase: 'Phase 3',
                desc: 'Codebase RAG with exact line citations',
              },
              {
                label: 'Automated PR Code Reviews',
                phase: 'Phase 4',
                desc: 'Syntax, security, and quality grading',
              },
              {
                label: 'AI Test & Doc Generator',
                phase: 'Phase 5',
                desc: 'Vitest suite generation & markdown docs',
              },
              {
                label: 'BullMQ Distributed Jobs',
                phase: 'Phase 4',
                desc: 'Asynchronous repo chunking worker',
              },
            ].map((f) => (
              <div
                key={f.label}
                className="group p-3.5 rounded-xl bg-surface-subtle/50 hover:bg-white border border-slate-200/60 hover:border-slate-300 hover:shadow-subtle transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold text-slate-850 group-hover:text-accent transition-colors">
                    {f.label}
                  </span>
                  <span className="badge-coming-soon text-[10px] px-2 py-0.5 whitespace-nowrap">
                    {f.phase}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-normal">{f.desc}</p>
                <div className="mt-2.5 flex items-center text-[11px] font-medium text-slate-400 group-hover:text-accent gap-1 transition-colors">
                  <span>Planned release</span>
                  <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
