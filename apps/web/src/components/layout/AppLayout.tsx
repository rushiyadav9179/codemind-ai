import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ErrorBoundary } from '../common/ErrorBoundary';

const routeTitles: Record<string, string> = {
  '/': 'Overview',
  '/repositories': 'Repositories',
  '/code-assistant': 'Code Assistant',
  '/code-reviews': 'Code Reviews',
  '/settings': 'Settings',
};

export function AppLayout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const title = routeTitles[location.pathname] ?? 'CodeMind AI';

  return (
    <div className="flex min-h-screen bg-background text-slate-850">
      {/* Sidebar for Desktop & Mobile drawer */}
      <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col lg:pl-[var(--sidebar-width)] min-w-0 transition-all duration-200">
        <TopBar title={title} onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)} />
        <main
          className="flex-1 overflow-auto p-4 sm:p-6 lg:p-10 relative bg-atmospheric"
          id="main-content"
        >
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
