import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '24px',
            background: 'var(--color-background)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
          role="alert"
        >
          <div
            style={{
              maxWidth: '400px',
              textAlign: 'center',
              background: 'var(--color-card)',
              padding: '32px',
              borderRadius: '12px',
              border: '1px solid var(--color-border)',
            }}
          >
            <div
              style={{
                fontSize: '48px',
                marginBottom: '16px',
              }}
            >
              ⚠️
            </div>
            <h1
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--color-foreground)',
                margin: '0 0 8px 0',
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--color-muted-foreground)',
                margin: '0 0 24px 0',
                lineHeight: 1.5,
              }}
            >
              An unexpected error occurred. Please try refreshing the app.
            </p>
            <button
              onClick={this.handleReset}
              style={{
                padding: '10px 24px',
                background: 'var(--color-primary)',
                color: 'var(--color-on-primary)',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
            {this.state.error && (
              <details
                style={{
                  marginTop: '16px',
                  textAlign: 'left',
                }}
              >
                <summary
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-muted-foreground)',
                    cursor: 'pointer',
                  }}
                >
                  Error details
                </summary>
                <pre
                  style={{
                    marginTop: '8px',
                    padding: '12px',
                    background: 'var(--color-muted)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: 'var(--color-secondary)',
                    overflow: 'auto',
                    maxHeight: '150px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
