import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => this.setState({ hasError: false, error: null });

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-surface-600">
            {this.props.name ? `Błąd w module „${this.props.name}".` : 'Coś poszło nie tak.'}
          </p>
          <p className="max-w-md text-sm text-surface-400">{this.state.error?.message}</p>
          <button
            onClick={this.handleRetry}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Odśwież
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
