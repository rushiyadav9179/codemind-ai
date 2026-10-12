import { Settings as SettingsIcon, Info } from 'lucide-react';

export function Settings() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-100">Settings</h2>
        <p className="text-sm text-gray-400 mt-1">Platform configuration — Phase 1</p>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon className="h-5 w-5 text-indigo-400" aria-hidden="true" />
          <h3 className="text-base font-semibold text-gray-100">Application</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-200">Version</p>
              <p className="text-xs text-gray-500">Current application version</p>
            </div>
            <span className="font-mono text-sm text-indigo-400">v0.1.0</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-200">Phase</p>
              <p className="text-xs text-gray-500">Current development phase</p>
            </div>
            <span className="badge-coming-soon">Phase 1 — Foundation</span>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-lg bg-indigo-950/40 border border-indigo-800/50">
        <Info className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm text-indigo-300">
          Additional settings (API keys, Ollama configuration, GitHub integration) will appear here
          in future phases.
        </p>
      </div>
    </div>
  );
}
