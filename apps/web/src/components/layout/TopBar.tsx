import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, LogOut, Menu, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useApiHealth } from '../../hooks/useApiHealth';
import { cn } from '../../lib/utils';

interface TopBarProps {
  title: string;
  onToggleMobileMenu?: () => void;
}

export function TopBar({ title, onToggleMobileMenu }: TopBarProps) {
  const { data: health, isLoading, isError } = useApiHealth();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState(false);

  async function handleLogout() {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      setLogoutError(true);
    }
  }

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

      <div className="flex items-center gap-2.5">
        {logoutError && (
          <span className="hidden text-xs text-rose-700 sm:inline" role="alert">
            Sign out failed
          </span>
        )}
        <span className="hidden max-w-44 truncate text-xs text-slate-600 sm:block">
          {user?.email}
        </span>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7667C8]/40"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Log out</span>
        </button>
        <div
          className="flex items-center gap-2.5 rounded-full border border-slate-200/80 bg-surface-subtle px-3 py-1.5 text-xs shadow-2xs"
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
          <div className="flex items-center gap-1.5 font-medium text-slate-500">
            <Activity className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span className="hidden sm:inline">API</span>
          </div>

          {isLoading && (
            <span className="animate-pulse font-mono text-[11px] text-slate-400">checking...</span>
          )}

          {!isLoading && isError && (
            <div className="flex items-center gap-1.5">
              <WifiOff className="h-3 w-3 text-red-500" aria-hidden="true" />
              <span className="badge-status-error py-0 text-[11px] leading-tight">unreachable</span>
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
                  'py-0 text-[11px] leading-tight font-medium',
                  health.status === 'healthy' ? 'badge-status-healthy' : 'badge-coming-soon',
                )}
              >
                {health.status}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
