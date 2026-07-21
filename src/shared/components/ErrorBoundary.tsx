// src/components/ErrorBoundary.tsx
import { Component, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

interface Props { children: ReactNode }
interface State { crashed: boolean; message: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { crashed: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { crashed: true, message: error?.message ?? 'Unknown error' }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Chillverse crash]', error, info)
    // Best-effort, fire-and-forget — feeds the Admin Dashboard's System
    // Health panel with real error volume (migration 0056). Never awaited
    // and any failure here is swallowed; a broken error-reporting call
    // must never itself crash the crash screen.
    supabase.rpc('client_log_error', {
      p_message: error?.message ?? 'Unknown error',
      p_stack: error?.stack ?? null,
      p_path: typeof window !== 'undefined' ? window.location.pathname : null,
    }).then(undefined, () => {})
  }

  render() {
    if (this.state.crashed) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexDirection: 'column', gap: 16,
          background: 'var(--bg)', padding: 24, textAlign: 'center',
        }}>
          <div style={{ fontSize: 40 }}>⚡</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
            Something went wrong
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 280, lineHeight: 1.6 }}>
            {this.state.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8, padding: '10px 24px', borderRadius: 12, border: 'none',
              background: 'var(--accent)', color: '#fff', fontWeight: 700,
              fontSize: 13, cursor: 'pointer',
            }}
          >
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
