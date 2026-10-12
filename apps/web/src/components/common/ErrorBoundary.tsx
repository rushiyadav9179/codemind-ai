import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="card flex flex-col items-center justify-center min-h-[360px] p-8 text-center max-w-lg mx-auto bg-white/95">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200 mb-4 shadow-2xs">
            <AlertTriangle className="h-8 w-8 text-rose-600" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold text-slate-850 mb-2 tracking-tight">
            Something went wrong
          </h2>
          <p className="text-sm text-slate-600 max-w-sm mb-4 leading-relaxed">
            An unexpected error occurred while rendering this interface.
          </p>
          {this.state.error && (
            <p className="text-xs font-mono text-rose-700 bg-rose-50 border border-rose-200/80 px-3.5 py-2 rounded-xl mb-6 max-w-md break-all">
              {this.state.error.message}
            </p>
          )}
          <button type="button" onClick={this.handleReset} className="btn-secondary">
            <RefreshCw className="h-4 w-4 text-slate-500" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
