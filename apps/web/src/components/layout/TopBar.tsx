import { useApiHealth } from '../../hooks/useApiHealth';
import { cn } from '../../lib/utils';
import { Activity, Wifi, WifiOff } from 'lucide-react';

export function TopBar({ title }: { title: string }) {
  const { data: health, isLoading, isError } = useApiHealth();

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-gray-800 bg-gray-950">
      <h1 className="text-lg font-semibold text-gray-100">{title}</h1>

      <div
        className="flex items-center gap-2 text-xs"
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
        <Activity className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
        <span className="text-gray-500">API</span>
        {isLoading && <span className="text-gray-600">checking...</span>}
        {!isLoading && isError && (
          <>
            <WifiOff className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
            <span className="badge-status-error">unreachable</span>
          </>
        )}
        {!isLoading && !isError && health && (
          <>
            <Wifi
              className={cn(
                'h-3.5 w-3.5',
                health.status === 'healthy' ? 'text-emerald-400' : 'text-amber-400',
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                health.status === 'healthy' ? 'badge-status-healthy' : 'badge-coming-soon',
              )}
            >
              {health.status}
            </span>
          </>
        )}
      </div>
    </header>
  );
}
