// src/features/chat/StarredMessagesPanel.tsx
// Every message the current user has starred in one DM. Private — nobody
// else can ever see this list (see migration 0046). Starring is exclusive
// to DMs, so this panel is always opened scoped to a single conversation
// rather than listing across every room.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Star } from 'lucide-react'
import { fetchStarredMessages, unstarMessage, MAX_STARRED_PER_ROOM, type StarredMessageEntry } from './starredMessages'

interface StarredMessagesPanelProps {
  open: boolean
  onClose: () => void
  myId: string | null
  /** The DM this panel is scoped to. */
  roomId: string | null
  /** Display label for the panel title (the DM partner's name). */
  roomLabel: string
}

function formatWhen(iso: string): string {
  const d = new Date(iso); const now = new Date(); const diff = now.getTime() - d.getTime()
  if (diff < 60000) return 'now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

export default function StarredMessagesPanel({ open, onClose, myId, roomId, roomLabel }: StarredMessagesPanelProps) {
  const [entries, setEntries] = useState<StarredMessageEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open || !myId || !roomId) return
    setLoading(true)
    fetchStarredMessages(myId, roomId).then(data => { setEntries(data); setLoading(false) })
  }, [open, myId, roomId])

  if (!open) return null

  async function handleUnstar(messageId: string) {
    if (!myId) return
    setEntries(prev => prev.filter(e => e.messageId !== messageId)) // optimistic
    const { error } = await unstarMessage(myId, messageId)
    if (error) console.error('Failed to unstar message:', error)
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', zIndex: 100 }} onClick={onClose}>
      <div className="neu-card" style={{ width: '100%', maxWidth: 500, margin: '0 auto', padding: 18, borderRadius: '20px 20px 0 0', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <Star size={16} style={{ color: '#ffc107', flexShrink: 0 }} fill="#ffc107" />
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Starred in {roomLabel}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>{entries.length}/{MAX_STARRED_PER_ROOM}</span>
            <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '30px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Loading…</div>
        ) : entries.length === 0 ? (
          <div style={{ padding: '30px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            Nothing starred yet. Long-press (or right-click) any message in this chat and choose Star to save it here — only you can see this list.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.map(entry => (
              <div
                key={entry.messageId}
                style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleUnstar(entry.messageId)}
                    title="Remove from Starred"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ffc107', flexShrink: 0, padding: 2 }}
                  >
                    <Star size={13} fill="#ffc107" />
                  </button>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text)', fontStyle: entry.deleted ? 'italic' : 'normal', opacity: entry.deleted ? 0.6 : 1 }}>
                  <span style={{ fontWeight: 600 }}>{entry.senderName}: </span>
                  {entry.deleted ? 'Message deleted' : (entry.type === 'poll' ? '📊 Poll' : entry.type === 'voice_note' ? '🎤 Voice note' : entry.content)}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Starred {formatWhen(entry.starredAt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
