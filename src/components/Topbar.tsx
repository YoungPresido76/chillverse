// src/components/Topbar.tsx
import { Link } from 'react-router-dom'
import { Bell, MessageCircle } from 'lucide-react'

interface TopbarProps {
  title: string
  onMenuClick: () => void
}

export default function Topbar({ title, onMenuClick }: TopbarProps) {
  return (
    <header className="topbar-shell">
      <div className="flex items-center gap-3">
        {/* Hamburger — visible on mobile AND tablet (below lg = 1024px) */}
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden flex flex-col gap-[5px] p-2"
          aria-label="Open menu"
          style={{ cursor: 'pointer', background: 'none', border: 'none' }}
        >
          <span style={{ display: 'block', height: 2, width: 18, background: 'var(--text-dim)', borderRadius: 2 }} />
          <span style={{ display: 'block', height: 2, width: 13, background: 'var(--text-dim)', borderRadius: 2 }} />
          <span style={{ display: 'block', height: 2, width: 16, background: 'var(--text-dim)', borderRadius: 2 }} />
        </button>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Bell */}
        <Link
          to="/coming-soon?feature=Notifications"
          aria-label="Notifications"
          style={{
            position: 'relative',
            width: 38, height: 38,
            borderRadius: 10,
            background: 'var(--surface)',
            boxShadow: '3px 3px 8px var(--neu-dark), -2px -2px 6px var(--neu-light)',
            color: 'var(--text-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
        >
          <Bell size={17} />
          <span style={{
            position: 'absolute', top: 7, right: 7,
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--accent)',
            border: '1.5px solid var(--bg)',
          }} />
        </Link>

        {/* MessageCircle */}
        <Link
          to="/chat"
          aria-label="Chat"
          style={{
            width: 38, height: 38,
            borderRadius: 10,
            background: 'var(--surface)',
            boxShadow: '3px 3px 8px var(--neu-dark), -2px -2px 6px var(--neu-light)',
            color: 'var(--text-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
        >
          <MessageCircle size={17} />
        </Link>
      </div>
    </header>
  )
}
