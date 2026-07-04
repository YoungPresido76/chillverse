// src/features/highlights/HighlightCard.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Trophy } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { toggleHighlightLike } from './highlights'
import { getGameMeta } from '../games/games'
import type { Highlight } from './types'

export default function HighlightCard({ highlight }: { highlight: Highlight }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [liked, setLiked] = useState(highlight.liked_by_me ?? false)
  const [likesCount, setLikesCount] = useState(highlight.likes_count)

  const meta = highlight.game_key ? getGameMeta(highlight.game_key) : undefined
  const Icon = meta?.icon ?? Trophy
  const accent = meta?.accent ?? '#f5c542'

  const author = highlight.author
  const authorName = author?.display_name || author?.username || 'Someone'

  async function handleLike() {
    if (!user) return
    const next = !liked
    setLiked(next)
    setLikesCount(c => c + (next ? 1 : -1))
    const ok = await toggleHighlightLike(highlight.id, user.id, liked)
    if (!ok) {
      setLiked(!next)
      setLikesCount(c => c + (next ? -1 : 1))
    }
  }

  function goToAuthor() {
    if (!highlight.author_id) return
    navigate(highlight.author_id === user?.id ? '/profile' : `/profile/${highlight.author_id}`)
  }

  return (
    <div style={{
      display: 'flex', gap: 12, padding: '14px 16px', borderRadius: 16,
      background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.06)',
      boxShadow: '2px 2px 8px var(--neu-dark),-1px -1px 5px var(--neu-light)',
    }}>
      <div
        onClick={goToAuthor}
        style={{
          width: 40, height: 40, borderRadius: 11, flexShrink: 0, cursor: 'pointer',
          background: `${accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon size={19} style={{ color: accent }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span onClick={goToAuthor} style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', cursor: 'pointer' }}>
            {authorName}
          </span>
          {meta && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {meta.name}</span>
          )}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, marginBottom: 8, lineHeight: 1.4 }}>
          {highlight.body}
        </p>

        <button
          type="button"
          onClick={handleLike}
          disabled={!user}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none',
            cursor: user ? 'pointer' : 'default', padding: 0, color: liked ? 'var(--red, #ff4f4f)' : 'var(--text-muted)',
          }}
        >
          <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
          <span style={{ fontSize: 12, fontWeight: 700 }}>{likesCount}</span>
        </button>
      </div>
    </div>
  )
}
