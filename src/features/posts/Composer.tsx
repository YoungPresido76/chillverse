// src/features/posts/Composer.tsx
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Sparkles } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { usePostEligibility, lockedReasonText } from './usePostEligibility'
import { getTagSuggestions } from './tagSuggestions'
import { createPost } from './posts'
import { ripple } from '../../shared/lib/ripple'
import TagAutosuggest from './TagAutosuggest'
import type { PostTag, TagSuggestion } from './types'

interface ComposerProps {
  open: boolean
  onClose: () => void
  onPosted: () => void
  /** Pass this when opening the composer right after an in-game event
   *  (e.g. a game win, achievement unlock) so it's pre-suggested at the top. */
  initialTag?: PostTag
}

export default function Composer({ open, onClose, onPosted, initialTag }: ComposerProps) {
  const { user } = useAuth()
  const { eligibility, loading: checkingEligibility } = usePostEligibility(open)

  const [body, setBody] = useState('')
  const [tags, setTags] = useState<PostTag[]>(initialTag ? [initialTag] : [])
  const [commentable, setCommentable] = useState(false)
  const [tagQuery, setTagQuery] = useState('')
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([])
  const [submitting, setSubmitting] = useState(false)

  // typed tag search (debounced-lite via effect)
  useEffect(() => {
    if (!user || !open) return
    const handle = setTimeout(() => {
      getTagSuggestions(user.id, tagQuery).then(results => {
        const withRecent = initialTag && tagQuery === ''
          ? [{ ...initialTag, fromRecentEvent: true }, ...results]
          : results
        setSuggestions(withRecent)
      })
    }, 200)
    return () => clearTimeout(handle)
  }, [tagQuery, user, open, initialTag])

  if (!open) return null

  function addTag(s: TagSuggestion) {
    if (tags.some(t => t.type === s.type && t.ref_id === s.ref_id)) return
    setTags(t => [...t, { type: s.type, ref_id: s.ref_id, label: s.label }])
    setTagQuery('')
  }

  function removeTag(i: number) {
    setTags(t => t.filter((_, idx) => idx !== i))
  }

  async function handleSubmit() {
    if (!user || !body.trim() || submitting) return
    setSubmitting(true)
    const { error } = await createPost({ authorId: user.id, body: body.trim(), tags, commentable })
    setSubmitting(false)
    if (!error) {
      setBody('')
      setTags([])
      setCommentable(false)
      onPosted()
      onClose()
    }
  }

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', zIndex: 100 }}
      onClick={onClose}
    >
      <div
        className="neu-card"
        style={{
          width: '100%', maxWidth: 800, margin: '0 auto', padding: 18, borderRadius: '20px 20px 0 0',
          maxHeight: '85vh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>New Post</p>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
            <X size={18} />
          </button>
        </div>

        {checkingEligibility ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
            Checking eligibility…
          </div>
        ) : eligibility && !eligibility.eligible ? (
          <div className="neu-inset" style={{ padding: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
              {lockedReasonText(eligibility)}
            </p>
            <p style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 6 }}>
              Reach Gold Rank, complete {eligibility.games_required} games, and set a profile picture to unlock posting.
            </p>
          </div>
        ) : (
          <>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              maxLength={500}
              placeholder="What's happening?"
              rows={4}
              style={{
                width: '100%', background: 'var(--surface2)', border: 'none', borderRadius: 12,
                padding: 12, fontSize: 14, color: 'var(--text)', outline: 'none', resize: 'none',
              }}
            />

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2" style={{ marginTop: 8 }}>
                {tags.map((t, i) => (
                  <span key={i} className="chip" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {t.label}
                    <button type="button" onClick={() => removeTag(i)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 0, display: 'flex' }}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <input
              value={tagQuery}
              onChange={e => setTagQuery(e.target.value)}
              placeholder="Tag an achievement, rank, game, friend…"
              style={{
                width: '100%', background: 'var(--surface2)', border: 'none', borderRadius: 10,
                padding: '8px 10px', fontSize: 12.5, color: 'var(--text)', outline: 'none', marginTop: 8,
              }}
            />
            <TagAutosuggest suggestions={suggestions} onPick={addTag} />

            <label className="flex items-center gap-2" style={{ marginTop: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={commentable} onChange={e => setCommentable(e.target.checked)} />
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Allow comments on this post</span>
            </label>

            <button
              type="button"
              className="btn-primary ripple-wrap"
              onClick={(e) => { ripple(e as Parameters<typeof ripple>[0]); handleSubmit() }}
              disabled={!body.trim() || submitting}
              style={{ width: '100%', padding: '11px 0', marginTop: 14, opacity: !body.trim() || submitting ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Sparkles size={14} /> {submitting ? 'Posting…' : 'Post'}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
