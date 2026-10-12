import { Construction } from 'lucide-react';
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
      className={cn('flex flex-col items-center justify-center text-center py-20 px-8', className)}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-950/50 border border-amber-800/50 mb-6">
        <Construction className="h-10 w-10 text-amber-400" aria-hidden="true" />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-xl font-semibold text-gray-100">{featureName}</h2>
        <span className="badge-coming-soon">Coming Soon</span>
      </div>

      <p className="text-sm text-gray-400 max-w-md mb-4">
        {description ??
          `${featureName} will be available in a future phase. The foundation is being built first.`}
      </p>

      {phase && (
        <p className="text-xs text-amber-500/70">
          Planned for: <span className="font-medium text-amber-400">{phase}</span>
        </p>
      )}
    </div>
  );
}
