// src/features/highlights/HighlightCard.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Share2, Check } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { toggleHighlightLike } from './highlights'
import { shareHighlight } from './shareHighlight'
import { HIGHLIGHT_ILLUSTRATIONS } from './highlightAssets'
import { BadgeIcon } from '../badges/badgeIcons'
import { getGameMeta } from '../games/games'
import Avatar from '../../shared/components/Avatar'
import type { Highlight } from './types'

export default function HighlightCard({ highlight }: { highlight: Highlight }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [liked, setLiked] = useState(highlight.liked_by_me ?? false)
  const [likesCount, setLikesCount] = useState(highlight.likes_count)
  const [shared, setShared] = useState(false)

  const author = highlight.author
  const authorName = author?.display_name || author?.username || 'Someone'
  const isOwn = highlight.author_id === user?.id

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

  async function handleShare() {
    setShared(true)
    try {
      await shareHighlight(highlight, authorName)
    } finally {
      setTimeout(() => setShared(false), 1600)
    }
  }

  function goToAuthor() {
    if (!highlight.author_id) return
    navigate(highlight.author_id === user?.id ? '/profile' : `/profile/${highlight.author_id}`)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 16,
      background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.06)',
      boxShadow: '2px 2px 8px var(--neu-dark),-1px -1px 5px var(--neu-light)',
    }}>
      {/* -- Left: name, caption, actions -- */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div onClick={goToAuthor} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 4 }}>
          <Avatar src={author?.avatar} name={authorName} size={20} />
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{authorName}</span>
        </div>

        <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-dim)', margin: '0 0 8px', lineHeight: 1.35 }}>
          {highlight.body}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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

          {/* Sharing is only available on your OWN highlight -- you can like anyone's, but not re-share it. */}
          {isOwn && (
            <button
              type="button"
              onClick={handleShare}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none',
                cursor: 'pointer', padding: 0, color: shared ? 'var(--gold, #f5c542)' : 'var(--text-muted)',
              }}
            >
              {shared ? <Check size={13} /> : <Share2 size={13} />}
              <span style={{ fontSize: 12, fontWeight: 700 }}>{shared ? 'Shared' : 'Share'}</span>
            </button>
          )}
        </div>
      </div>

      {/* -- Right: the art -- illustration / badge icon / profile pic -- */}
      <HighlightArt highlight={highlight} authorName={authorName} />
    </div>
  )
}

function HighlightArt({ highlight, authorName }: { highlight: Highlight; authorName: string }) {
  const size = 68

  if (highlight.kind === 'map_complete') {
    return (
      <div style={{ flexShrink: 0 }}>
        <Avatar src={highlight.author?.avatar} name={authorName} userId={highlight.author_id} size={size} radius={size * 0.3} />
      </div>
    )
  }

  if (highlight.kind === 'leaderboard_badge') {
    const accent = highlight.badge_id === 'leaderboard_legend' ? '#f5c542' : '#9b6dff'
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center', background: `${accent}1f`,
      }}>
        <BadgeIcon iconKey={highlight.badge?.icon ?? 'hand-metal'} size={size * 0.5} color={accent} />
      </div>
    )
  }

  const src = HIGHLIGHT_ILLUSTRATIONS[highlight.kind]
  if (src) {
    return (
      <img
        src={src}
        alt=""
        style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
      />
    )
  }

  // game_result -- "share your win" from the game-over screen. Use that
  // game's own icon + accent colour (same catalog Games.tsx/GameShell use)
  // instead of a blank circle.
  if (highlight.kind === 'game_result') {
    const game = highlight.game_key ? getGameMeta(highlight.game_key) : undefined
    const accent = game?.accent ?? '#ff6b00'
    const GameIcon = game?.icon
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center', background: `${accent}1f`,
      }}>
        {GameIcon && <GameIcon size={size * 0.46} color={accent} />}
      </div>
    )
  }

  // achievement (legacy kind) -- no custom art assigned yet, so fall back
  // to a soft brand-colour circle rather than showing nothing.
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'rgba(255,107,0,0.12)',
    }} />
  )
}
