import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'card flex flex-col items-center justify-center text-center py-16 px-8 max-w-lg mx-auto bg-white/95',
        className,
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-subtle border border-slate-200/80 mb-5 text-slate-500 shadow-2xs">
        <Icon className="h-7 w-7 text-[#7667C8]" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-bold text-slate-850 mb-2 tracking-tight">{title}</h3>
      <p className="text-sm text-slate-600 max-w-sm mb-6 leading-relaxed">{description}</p>
      {action}
    </div>
  );
}
