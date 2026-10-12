import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  GitBranch,
  MessageSquareCode,
  GitPullRequest,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface NavItem {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  comingSoon?: boolean;
}

const navItems: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/repositories', icon: GitBranch, label: 'Repositories', comingSoon: true },
  { to: '/code-assistant', icon: MessageSquareCode, label: 'Code Assistant', comingSoon: true },
  { to: '/code-reviews', icon: GitPullRequest, label: 'Code Reviews', comingSoon: true },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-width)] flex-col bg-white border-r border-slate-200/80 transition-transform duration-300 ease-in-out lg:translate-x-0',
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
        )}
        aria-label="Main navigation"
      >
        {/* Brand Header */}
        <div className="flex h-18 items-center justify-between px-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#7667C8] to-[#9B8FE0] text-white shadow-sm shadow-[#7667C8]/25">
              <Sparkles className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-850 tracking-tight block leading-tight">
                CodeMind AI
              </span>
              <span className="text-[10px] font-semibold text-[#7667C8] tracking-wider uppercase block">
                Intelligence Platform
              </span>
            </div>
          </div>

          {/* Close button for mobile */}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto py-6 px-4" aria-label="Sidebar navigation">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Platform
          </div>
          <ul className="space-y-1.5" role="list">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                      isActive
                        ? 'bg-[#EAE5FF]/70 text-[#5F4FB5] font-semibold shadow-xs'
                        : 'text-slate-600 hover:bg-surface-subtle hover:text-slate-850',
                    )
                  }
                  aria-label={item.comingSoon ? `${item.label} (coming soon)` : item.label}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={cn(
                          'h-4.5 w-4.5 flex-shrink-0 transition-colors',
                          isActive ? 'text-[#7667C8]' : 'text-slate-400 group-hover:text-slate-600',
                        )}
                        aria-hidden="true"
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.comingSoon && (
                        <span
                          className="badge-coming-soon text-[10px] px-1.5 py-0.5 leading-none"
                          aria-hidden="true"
                        >
                          Soon
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Workspace Footer Card */}
        <div className="p-4 border-t border-slate-100">
          <div className="rounded-xl bg-surface-subtle/80 border border-slate-200/60 p-3.5 flex items-center justify-between">
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-850 truncate">CodeMind Platform</p>
              <p className="text-[11px] text-slate-500 font-mono">v0.1.0 • Phase 1</p>
            </div>
            <div
              className="h-2 w-2 rounded-full bg-[#1E6B43] shadow-[0_0_8px_rgba(30,107,67,0.4)]"
              title="System operational"
            />
          </div>
        </div>
      </aside>
    </>
  );
}
