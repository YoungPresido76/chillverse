// src/features/posts/FeedPage.tsx
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ripple } from '../../shared/lib/ripple'
import Feed from './Feed'
import HighlightsStrip from '../highlights/HighlightsStrip'

export default function FeedPage() {
  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 56 }}>
      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', marginBottom: 16, paddingTop: 4 }}>
        <button
          type="button"
          onClick={(e) => { ripple(e); navigate('/dashboard') }}
          style={{
            width: 38, height: 38, borderRadius: 11,
            background: 'var(--surface)',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '2px 2px 6px var(--neu-dark)',
            color: 'var(--text-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Feed</h1>
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: 0 }}>What the community's up to</p>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        <HighlightsStrip />
        <Feed />
      </div>
    </div>
  )
}
