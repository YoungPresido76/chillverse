// src/features/posts/PostCard.tsx
import { useState } from 'react'
import { Heart, MessageCircle, Sparkles } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { toggleLike } from './posts'
import { ripple } from '../../shared/lib/ripple'
import CommentThread from './CommentThread'
import type { Post } from './types'

const TAG_ICON: Record<string, string> = {
  achievement: '🏆', game_result: '🎮', multiplayer_result: '⚔️', rank: '🎖️',
  streak: '🔥', mission: '📋', user: '👤', avatar: '🖼️', artifact: '💎', mall_item: '🛍️',
}

export default function PostCard({ post }: { post: Post }) {
  const { user } = useAuth()
  const [liked, setLiked] = useState(post.liked_by_me ?? false)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [showComments, setShowComments] = useState(false)

  const author = post.author
  const authorName = post.author_type === 'system'
    ? 'Chillverse'
    : post.author_type === 'admin'
      ? (author?.display_name || author?.username || 'Admin')
      : (author?.display_name || author?.username || 'Unknown')

  async function handleLike() {
    if (!user) return
    const next = !liked
    setLiked(next)
    setLikesCount(c => c + (next ? 1 : -1))
    const ok = await toggleLike(post.id, user.id, liked)
    if (!ok) {
      // revert on failure
      setLiked(!next)
      setLikesCount(c => c + (next ? -1 : 1))
    }
  }

  return (
    <div className="neu-card" style={{ padding: 16, marginBottom: 12 }}>
      <div className="flex items-center gap-3">
        <div style={{
          width: 38, height: 38, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
          background: 'linear-gradient(135deg, var(--purple), var(--blue))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 800, color: '#fff',
        }}>
          {author?.avatar && author.avatar.startsWith('http')
            ? <img src={author.avatar} alt={authorName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : authorName.charAt(0).toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
            {authorName}
            {post.author_type !== 'user' && (
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'rgba(255,107,0,0.12)', padding: '1px 6px', borderRadius: 6 }}>
                {post.author_type === 'system' ? 'SYSTEM' : 'ADMIN'}
              </span>
            )}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            {new Date(post.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5, marginTop: 10, whiteSpace: 'pre-wrap' }}>
        {post.body}
      </p>

      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2" style={{ marginTop: 10 }}>
          {post.tags.map((tag, i) => (
            <span key={i} className="chip">
              {TAG_ICON[tag.type] ?? '🏷️'} {tag.label}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4" style={{ marginTop: 12 }}>
        <button
          type="button"
          className="ripple-wrap"
          onClick={(e) => { ripple(e as Parameters<typeof ripple>[0]); handleLike() }}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none',
            cursor: 'pointer', color: liked ? 'var(--red)' : 'var(--text-dim)', fontSize: 12.5, fontWeight: 600,
          }}
        >
          <Heart size={15} fill={liked ? 'var(--red)' : 'none'} />
          {likesCount}
        </button>

        {post.commentable && (
          <button
            type="button"
            onClick={() => setShowComments(s => !s)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 12.5, fontWeight: 600 }}
          >
            <MessageCircle size={15} />
            {post.comments_count}
          </button>
        )}

        {post.influence > 0 && (
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>
            <Sparkles size={12} /> {post.influence}
          </span>
        )}
      </div>

      {post.commentable && showComments && (
        <div style={{ marginTop: 12 }}>
          <CommentThread postId={post.id} />
        </div>
      )}
    </div>
  )
}
