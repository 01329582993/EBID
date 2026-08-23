import React from 'react';
import { parseApiError } from '../utils/apiError';

/**
 * Renders a normalized backend error (see utils/apiError.js) as a
 * full-page panel. Pass either a raw axios error via `error`, or an
 * already-normalized object via `details`.
 */
function ErrorDetailsPanel({ error, details, onRetry, onGoHome }) {
  const normalized = details || parseApiError(error) || {};
  const { status, title, message, fieldErrors, timestamp } = normalized;

  return (
    <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="card" style={{ maxWidth: 480, width: '100%', borderTop: '2px solid var(--accent-red)' }}>
        <div style={{ marginBottom: 8, color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: 'var(--font-mono)' }}>
          {status ? `Error ${status}` : 'Request Failed'}
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
          {title || 'Something went wrong'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: fieldErrors ? 12 : 20 }}>
          {message}
        </p>

        {fieldErrors && (
          <ul style={{ listStyle: 'none', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(fieldErrors).map(([field, msg]) => (
              <li key={field} style={{ fontSize: '0.8rem', color: 'var(--accent-red)', fontFamily: 'var(--font-mono)' }}>
                {field}: {msg}
              </li>
            ))}
          </ul>
        )}

        {timestamp && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 24, borderTop: '1px dashed var(--border)', paddingTop: 12 }}>
            {new Date(timestamp).toLocaleString()}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-outline" onClick={onGoHome}>Go Home</button>
          <button className="btn btn-gold" onClick={onRetry}>Try Again</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Fallback UI for uncaught render-time errors (JS exceptions in the
 * component tree). This is the only case a React error boundary can
 * actually catch — API/network errors are surfaced separately via
 * toast, or via <ErrorBoundary error={caughtErr} /> when a page wants
 * a full-page error state instead of a toast.
 */
function RenderErrorPanel({ onRetry, onGoHome, errorMessage }) {
  return (
    <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="card" style={{ maxWidth: 480, width: '100%', borderTop: '2px solid var(--accent-red)', textAlign: 'center' }}>
        <div style={{ marginBottom: 8, color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: 'var(--font-mono)' }}>
          Unexpected Error
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
          Something broke
        </h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
          This part of the page couldn't be displayed. You can try again or head back to the auctions.
        </p>

        {import.meta.env.DEV && errorMessage && (
          <pre style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            color: 'var(--accent-red)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: 12,
            textAlign: 'left',
            overflowX: 'auto',
            marginBottom: 20,
          }}>
            {errorMessage}
          </pre>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn btn-outline" onClick={onGoHome}>Go Home</button>
          <button className="btn btn-gold" onClick={onRetry}>Reload</button>
        </div>
      </div>
    </div>
  );
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Hook point for logging to a monitoring service if one is added later.
    console.error('ErrorBoundary caught a render error:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    // Case 1: an axios error (or already-normalized details) was passed
    // in explicitly — a page caught a failed request and wants a
    // full-page error state instead of just a toast.
    if (this.props.error || this.props.errorDetails) {
      return (
        <ErrorDetailsPanel
          error={this.props.error}
          details={this.props.errorDetails}
          onRetry={this.props.onRetry || this.handleReload}
          onGoHome={this.handleGoHome}
        />
      );
    }

    // Case 2: an uncaught render error was thrown somewhere in children.
    if (this.state.hasError) {
      return (
        <RenderErrorPanel
          onRetry={this.handleReload}
          onGoHome={this.handleGoHome}
          errorMessage={this.state.error?.message || String(this.state.error)}
        />
      );
    }

    return this.props.children;
  }
}
