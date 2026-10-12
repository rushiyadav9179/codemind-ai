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
  const title = routeTitles[location.pathname] ?? 'CodeMind AI';

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar />
      <div className="flex flex-1 flex-col pl-[var(--sidebar-width)] min-w-0">
        <TopBar title={title} />
        <main className="flex-1 overflow-auto p-6" id="main-content">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
