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
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-950 mb-4">
            <AlertTriangle className="h-8 w-8 text-red-400" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-gray-100 mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-400 max-w-sm mb-1">
            An unexpected error occurred in this section.
          </p>
          {this.state.error && (
            <p className="text-xs font-mono text-red-400 bg-red-950/50 px-3 py-1 rounded mb-6">
              {this.state.error.message}
            </p>
          )}
          <button onClick={this.handleReset} className="btn-secondary">
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
