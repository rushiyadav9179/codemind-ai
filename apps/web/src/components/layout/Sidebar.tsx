import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  GitBranch,
  MessageSquareCode,
  GitPullRequest,
  Settings,
  Brain,
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

export function Sidebar() {
  return (
    <aside
      className="fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-width)] flex-col bg-gray-900 border-r border-gray-800"
      aria-label="Main navigation"
    >
      <div className="flex h-16 items-center gap-3 px-5 border-b border-gray-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
          <Brain className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <span className="text-base font-semibold text-gray-100 tracking-tight">CodeMind AI</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3" aria-label="Sidebar navigation">
        <ul className="space-y-1" role="list">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-400'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100',
                  )
                }
                aria-label={item.comingSoon ? `${item.label} (coming soon)` : item.label}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                {item.comingSoon && (
                  <span className="badge-coming-soon text-[10px] px-1.5 py-0" aria-hidden="true">
                    Soon
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-gray-800 p-4">
        <p className="text-xs text-gray-600 text-center">CodeMind AI v0.1.0 — Phase 1</p>
      </div>
    </aside>
  );
}
