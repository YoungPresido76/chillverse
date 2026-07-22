// src/layout/BlogLayout.tsx
// Standalone chrome for the public blog — deliberately NOT AppLayout.
// Mirrors how discord.com/blog is a separate surface from discord.com/app:
// its own header/footer, reachable and readable by anyone, signed in or not.
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { Newspaper } from 'lucide-react'
import Logo from './Logo'
import Wordmark from './Wordmark'
import { useAuth } from '../features/auth/useAuth'
import { ripple } from '../shared/lib/ripple'

export default function BlogLayout() {
  const { session } = useAuth()
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <header
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 64, padding: '0 clamp(1rem, 4vw, 2.5rem)',
          background: 'color-mix(in srgb, var(--bg) 88%, transparent)',
          backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border)',
        }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <Logo size={30} />
          <Wordmark size={17} animated={false} />
          <span style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 12, fontWeight: 800, color: 'var(--text-dim)',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 999, padding: '4px 10px', marginLeft: 2,
          }}>
            <Newspaper size={12} /> Blog
          </span>
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <HeaderLink to="/blog">Latest</HeaderLink>
          <HeaderLink to="/blog/updates">Update Log</HeaderLink>
          <button
            type="button"
            onClick={(e) => { ripple(e); navigate(session ? '/dashboard' : '/login') }}
            className="ripple-wrap"
            style={{
              marginLeft: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: '#fff',
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              border: 'none', borderRadius: 999, padding: '9px 18px',
            }}
          >
            {session ? 'Open App' : 'Log In'}
          </button>
        </nav>
      </header>

      <main style={{ flex: 1, padding: '32px clamp(1rem, 4vw, 2.5rem) 64px' }}>
        <Outlet />
      </main>

      <footer style={{
        borderTop: '1px solid var(--border)', padding: '24px clamp(1rem, 4vw, 2.5rem)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Logo size={18} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>© {new Date().getFullYear()} Chillverse</span>
        </div>
        <div style={{ display: 'flex', gap: 18 }}>
          <Link to="/about" style={footerLinkStyle}>About</Link>
          <Link to="/privacy" style={footerLinkStyle}>Privacy</Link>
          <Link to="/terms" style={footerLinkStyle}>Terms</Link>
          <Link to="/" style={footerLinkStyle}>Chillverse Home</Link>
        </div>
      </footer>
    </div>
  )
}

function HeaderLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      style={{
        fontSize: 12.5, fontWeight: 700, color: 'var(--text-dim)', textDecoration: 'none',
        padding: '8px 12px', borderRadius: 8,
      }}
    >
      {children}
    </Link>
  )
}

const footerLinkStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none',
}
