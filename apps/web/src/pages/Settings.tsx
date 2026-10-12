import { Settings as SettingsIcon, Info, CheckCircle2 } from 'lucide-react';

export function Settings() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-850 tracking-tight">
          Settings
        </h2>
        <p className="text-sm sm:text-base text-slate-600 mt-1.5 leading-relaxed">
          Platform configuration, active environment metrics, and system preferences.
        </p>
      </div>

      <div className="card space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="h-10 w-10 rounded-xl bg-accent-muted flex items-center justify-center text-[#7667C8]">
            <SettingsIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-850 tracking-tight">Core Application</h3>
            <p className="text-xs text-slate-500">System configuration and build version</p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          <div className="py-3.5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-850">Platform Version</p>
              <p className="text-xs text-slate-500">Semantic release version</p>
            </div>
            <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-surface-subtle border border-slate-200 text-slate-700">
              v0.1.0
            </span>
          </div>

          <div className="py-3.5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-850">Milestone</p>
              <p className="text-xs text-slate-500">Current implementation track</p>
            </div>
            <span className="badge-coming-soon">Phase 1 — Project Foundation</span>
          </div>

          <div className="py-3.5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-850">Security & Sandboxing</p>
              <p className="text-xs text-slate-500">Zero cloud API secrets committed</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1E6B43]">
              <CheckCircle2 className="h-4 w-4" />
              Verified Local
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-[#EAE5FF]/40 border border-[#7667C8]/20 shadow-subtle">
        <div className="p-1 rounded-lg bg-white shadow-2xs text-[#7667C8]">
          <Info className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-850 mb-0.5">Looking ahead to Phase 2</p>
          <p className="text-xs text-slate-600 leading-relaxed">
            GitHub OAuth application keys, local Ollama runtime model selectors (Llama 3, Mistral),
            and vector chunking configurations will be manageable here in subsequent phases.
          </p>
        </div>
      </div>
    </div>
  );
}
