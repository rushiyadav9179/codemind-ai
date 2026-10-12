import { useApiHealth } from '../../hooks/useApiHealth';
import { cn } from '../../lib/utils';
import { Activity, Menu, Wifi, WifiOff } from 'lucide-react';

interface TopBarProps {
  title: string;
  onToggleMobileMenu?: () => void;
}

export function TopBar({ title, onToggleMobileMenu }: TopBarProps) {
  const { data: health, isLoading, isError } = useApiHealth();

  return (
    <header className="h-18 flex items-center justify-between px-4 sm:px-6 lg:px-10 border-b border-slate-200/70 bg-white/80 backdrop-blur-md sticky top-0 z-30 transition-all">
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-850 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-850 tracking-tight">{title}</h1>
        </div>
      </div>

      {/* API connectivity status pill */}
      <div
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-surface-subtle border border-slate-200/80 text-xs shadow-2xs"
        title={
          isLoading ? 'Checking API...' : isError ? 'API unreachable' : `API ${health?.status}`
        }
        aria-label={
          isLoading
            ? 'Checking API status'
            : isError
              ? 'API is unreachable'
              : `API is ${health?.status}`
        }
      >
        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
          <Activity className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          <span className="hidden sm:inline">API</span>
        </div>

        {isLoading && (
          <span className="text-slate-400 font-mono text-[11px] animate-pulse">checking...</span>
        )}

        {!isLoading && isError && (
          <div className="flex items-center gap-1.5">
            <WifiOff className="h-3 w-3 text-red-500" aria-hidden="true" />
            <span className="badge-status-error text-[11px] py-0 px-2 leading-tight">
              unreachable
            </span>
          </div>
        )}

        {!isLoading && !isError && health && (
          <div className="flex items-center gap-1.5">
            <Wifi
              className={cn(
                'h-3 w-3',
                health.status === 'healthy' ? 'text-[#1E6B43]' : 'text-amber-600',
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                'text-[11px] py-0 px-2 leading-tight font-medium',
                health.status === 'healthy' ? 'badge-status-healthy' : 'badge-coming-soon',
              )}
            >
              {health.status}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
