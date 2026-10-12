import { cn } from '../../lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2.5',
  lg: 'h-12 w-12 border-3',
};

export function LoadingSpinner({
  size = 'md',
  className,
  label = 'Loading...',
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn('flex flex-col items-center justify-center gap-3', className)}
    >
      <div
        className={cn(
          'rounded-full border-slate-200 border-t-[#7667C8] animate-spin',
          sizeClasses[size],
        )}
      />
      <span className="text-xs font-medium text-slate-500 font-mono tracking-tight">{label}</span>
    </div>
  );
}
