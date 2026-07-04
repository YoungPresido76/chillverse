// src/features/search/SearchOverlay.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Search as SearchIcon, User } from 'lucide-react'
import { searchPlayers, searchGames, searchMallItems, type PlayerResult } from './search'
import type { GameMeta } from '../games/games'
import type { MallItem } from '../../shared/types'

type Tab = 'players' | 'games' | 'mall'

const TABS: { id: Tab; label: string }[] = [
  { id: 'players', label: 'Players' },
  { id: 'games', label: 'Games' },
  { id: 'mall', label: 'Mall Items' },
]

export default function SearchOverlay({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('players')
  const [query, setQuery] = useState('')
  const [players, setPlayers] = useState<PlayerResult[]>([])
  const [games, setGames] = useState<GameMeta[]>([])
  const [mallItems, setMallItems] = useState<MallItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query.trim()) {
      setPlayers([]); setGames([]); setMallItems([])
      return
    }
    setLoading(true)
    const t = setTimeout(async () => {
      if (tab === 'players') setPlayers(await searchPlayers(query))
      if (tab === 'games') setGames(searchGames(query))
      if (tab === 'mall') setMallItems(await searchMallItems(query))
      setLoading(false)
    }, 250)
    return () => clearTimeout(t)
  }, [query, tab])

  function goToPlayer(id: string) {
    onClose()
    navigate(`/profile/${id}`)
  }

  function goToGame(id: string) {
    onClose()
    navigate('/games', { state: { openGame: id } })
  }

  function goToMall() {
    onClose()
    navigate('/mall')
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 900, background: 'var(--bg)', overflowY: 'auto', animation: 'slideInRight 0.28s cubic-bezier(0.4,0,0.2,1) both' }}>
      {/* Sticky header with search input */}
      <div style={{ position: 'sticky', top: 0, zIndex: 910, background: 'rgba(17,17,19,0.98)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 13, background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <SearchIcon size={15} style={{ color: 'var(--text-muted)' }} />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search players, games, mall items…"
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 14 }}
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, padding: '0 16px 12px' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                padding: '7px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                background: tab === t.id ? 'var(--accent)' : 'var(--surface2)',
                color: tab === t.id ? '#fff' : 'var(--text-dim)',
                border: 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {!query.trim() && (
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>
            Start typing to search {TABS.find(t => t.id === tab)?.label.toLowerCase()}
          </p>
        )}

        {query.trim() && loading && (
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>Searching…</p>
        )}

        {query.trim() && !loading && tab === 'players' && players.length === 0 && (
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>No players found</p>
        )}
        {tab === 'players' && players.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => goToPlayer(p.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              {p.avatar?.startsWith('http') ? <img src={p.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: 10, objectFit: 'cover' }} /> : (p.avatar || <User size={16} />)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{p.display_name || p.username}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>@{p.username}</div>
            </div>
          </button>
        ))}

        {query.trim() && !loading && tab === 'games' && games.length === 0 && (
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>No games found</p>
        )}
        {tab === 'games' && games.map(g => (
          <button
            key={g.id}
            type="button"
            onClick={() => goToGame(g.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${g.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <g.icon size={17} style={{ color: g.accent }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{g.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.tagline}</div>
            </div>
          </button>
        ))}

        {query.trim() && !loading && tab === 'mall' && mallItems.length === 0 && (
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>No mall items found</p>
        )}
        {tab === 'mall' && mallItems.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={goToMall}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
              {item.image_url ? <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{item.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{item.price_gems ? `${item.price_gems} 💎` : 'Free'}</div>
            </div>
          </button>
        ))}
      </div>

      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }
      `}</style>
    </div>
  )
}
