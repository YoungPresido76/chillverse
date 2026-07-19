// src/features/posts/FeedPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Rss, Megaphone } from 'lucide-react'
import { ripple } from '../../shared/lib/ripple'
import Feed from './Feed'
import AnnouncementsFeed from './AnnouncementsFeed'
import HighlightsStrip from '../highlights/HighlightsStrip'

type FeedTab = 'feed' | 'announcements'

const TABS: { key: FeedTab; label: string; icon: typeof Rss }[] = [
  { key: 'feed', label: 'Feed', icon: Rss },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
]

export default function FeedPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<FeedTab>('feed')

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
            border: '1px solid var(--border)',
            boxShadow: 'var(--elev-raise-sm)',
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
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, borderBottom: '1px solid var(--border)' }}>
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={(e) => { ripple(e); setTab(t.key) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 700,
                  color: active ? 'var(--accent)' : 'var(--text-dim)',
                  borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                <Icon size={14} /> {t.label}
              </button>
            )
          })}
        </div>

        {tab === 'feed' ? (
          <>
            <HighlightsStrip />
            <Feed />
          </>
        ) : (
          <AnnouncementsFeed />
        )}
      </div>
    </div>
  )
}
