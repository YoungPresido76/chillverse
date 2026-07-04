// src/features/posts/Feed.tsx
import { useState } from 'react'
import { PenSquare } from 'lucide-react'
import { useFeed } from './useFeed'
import { ripple } from '../../shared/lib/ripple'
import PostCard from './PostCard'
import Composer from './Composer'
import type { PostTag } from './types'

/**
 * Drop this into Dashboard.tsx. Pass `initialTag` when navigating here
 * right after an in-game event (win, achievement, rank-up) so the composer
 * opens with that tag pre-suggested — see Composer.tsx's `initialTag` prop.
 */
export default function Feed({ initialTag }: { initialTag?: PostTag }) {
  const { posts, loading, refetch, removePostLocally } = useFeed()
  const [composerOpen, setComposerOpen] = useState(false)

  return (
    <section className="su d3" style={{ marginTop: 12 }}>
      <div className="flex items-center justify-end" style={{ marginBottom: 10 }}>
        <button
          type="button"
          className="btn-secondary ripple-wrap"
          onClick={(e) => { ripple(e as Parameters<typeof ripple>[0]); setComposerOpen(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12 }}
        >
          <PenSquare size={13} /> Post
        </button>
      </div>

      {loading ? (
        <div className="neu-card" style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12.5 }}>
          Loading feed…
        </div>
      ) : posts.length === 0 ? (
        <div className="neu-card" style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12.5 }}>
          No posts yet — be the first to share something.
        </div>
      ) : (
        posts.map(post => <PostCard key={post.id} post={post} onDeleted={removePostLocally} />)
      )}

      <Composer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onPosted={refetch}
        initialTag={initialTag}
      />
    </section>
  )
}
