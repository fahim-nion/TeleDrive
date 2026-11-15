import React, { Component, ErrorInfo, ReactNode } from 'react';
import { IconRefresh } from './Icons';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TeleDrive UI caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          maxWidth: '520px',
          margin: '40px auto',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-md)',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800 }}>
            {this.props.fallbackTitle || 'Display Issue Encountered'}
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 20px 0', lineHeight: 1.5 }}>
            {this.state.error?.message || 'A temporary rendering error occurred. Please try reloading this section.'}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '10px 24px',
              borderRadius: '100px',
              background: 'var(--primary)',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 800,
              fontSize: '11px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <IconRefresh size={14} />
            <span>RETRY DISPLAY</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
