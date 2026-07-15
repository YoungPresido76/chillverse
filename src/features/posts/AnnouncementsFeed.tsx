// src/features/posts/AnnouncementsFeed.tsx
import { useState } from 'react'
import { Megaphone } from 'lucide-react'
import { useModRole } from '../moderation/useModRole'
import { useAnnouncements } from './useAnnouncements'
import { ripple } from '../../shared/lib/ripple'
import PostCard from './PostCard'
import StaffComposer from './StaffComposer'

export default function AnnouncementsFeed() {
  const { isStaff } = useModRole()
  const { posts, loading, refetch, removePostLocally } = useAnnouncements()
  const [composerOpen, setComposerOpen] = useState(false)

  return (
    <section className="su d3" style={{ marginTop: 12 }}>
      {isStaff && (
        <div className="flex items-center justify-end" style={{ marginBottom: 10 }}>
          <button
            type="button"
            className="btn-secondary ripple-wrap"
            onClick={(e) => { ripple(e); setComposerOpen(true) }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12 }}
          >
            <Megaphone size={13} /> New post
          </button>
        </div>
      )}

      {loading ? (
        <div className="neu-card" style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12.5 }}>
          Loading announcements…
        </div>
      ) : posts.length === 0 ? (
        <div className="neu-card" style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12.5 }}>
          No announcements yet — check back soon.
        </div>
      ) : (
        posts.map(post => <PostCard key={post.id} post={post} onDeleted={removePostLocally} />)
      )}

      {isStaff && (
        <StaffComposer
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          onPosted={refetch}
        />
      )}
    </section>
  )
}
