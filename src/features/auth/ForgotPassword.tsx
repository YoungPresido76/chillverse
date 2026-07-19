// src/pages/ForgotPassword.tsx
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { sendPasswordReset } from './auth'
import Wordmark from '../../layout/Wordmark'
import Logo from '../../layout/Logo'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }
    setError('')
    setLoading(true)
    const { error: err } = await sendPasswordReset(email.trim())
    setLoading(false)

    if (err) {
      setError(err.message)
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div className="fixed w-[400px] h-[400px] rounded-full blur-[100px] -top-20 -left-24 pointer-events-none" style={{ background: 'rgba(155,109,255,0.10)' }} />
      <div className="fixed w-[350px] h-[350px] rounded-full blur-[100px] -bottom-24 -right-20 pointer-events-none" style={{ background: 'rgba(255,77,139,0.06)' }} />

      <div className="relative z-[2] w-full max-w-[460px] neu-card" style={{ padding: '32px 44px' }}>

        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, textDecoration: 'none' }}>
          <Logo size={28} />
          <Wordmark size={20} animated={false} />
        </Link>

        {sent ? (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6, color: 'var(--text)' }}>Check your inbox</h1>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 28, lineHeight: 1.6 }}>
              If an account exists for <strong style={{ color: 'var(--text)' }}>{email}</strong>, we've sent a link to reset your password.
            </p>

            <Link
              to="/login"
              className="btn-primary"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '13px', borderRadius: 14,
                fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center',
                justifyContent: 'center', textDecoration: 'none', textAlign: 'center',
              }}
            >
              Back to login
            </Link>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6, color: 'var(--text)' }}>Reset your password</h1>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 28 }}>Enter your email and we'll send you a reset link.</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  autoComplete="email"
                  style={{
                    background: 'var(--surface2)', border: `1px solid ${error ? 'var(--red)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: 12, padding: '12px 14px', fontSize: 14, color: 'var(--text)', outline: 'none',
                    boxShadow: 'var(--elev-inset)',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'color-mix(in srgb, var(--accent) 40%, transparent)' }}
                  onBlur={e => { e.target.style.borderColor = error ? 'var(--red)' : 'rgba(255,255,255,0.07)' }}
                />
                {error && <span style={{ fontSize: 12, color: 'var(--red)' }}>{error}</span>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ padding: '13px', borderRadius: 14, fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}
              >
                {loading
                  ? <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                  : 'Send reset link →'}
              </button>
            </form>
          </>
        )}

        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 20 }}>
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>Back to login</Link>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
