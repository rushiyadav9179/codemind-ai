import { Construction, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ComingSoonProps {
  featureName: string;
  description?: string;
  phase?: string;
  className?: string;
}

export function ComingSoon({ featureName, description, phase, className }: ComingSoonProps) {
  return (
    <div
      className={cn(
        'card flex flex-col items-center justify-center text-center py-20 px-8 max-w-xl mx-auto shadow-subtle border-slate-200/80 bg-white/90 backdrop-blur-xs',
        className,
      )}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#FEF3C7]/60 border border-[#FDE68A] mb-6 shadow-2xs">
        <Construction className="h-9 w-9 text-[#92400E]" aria-hidden="true" />
      </div>

      <div className="flex items-center gap-2.5 mb-3">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-850 tracking-tight">
          {featureName}
        </h2>
        <span className="badge-coming-soon">Coming Soon</span>
      </div>

      <p className="text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
        {description ??
          `${featureName} will be available in a future phase. The foundation is currently operational.`}
      </p>

      {phase && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-subtle border border-slate-200 text-xs text-slate-600">
          <Sparkles className="h-3.5 w-3.5 text-[#7667C8]" />
          Planned Milestone: <span className="font-semibold text-slate-850">{phase}</span>
        </div>
      )}
    </div>
  );
}
