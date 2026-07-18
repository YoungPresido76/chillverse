// src/features/chat/PollComposerModal.tsx
// Poll creation modal — Global Chat only, Verified users and Staff/
// Moderator/Admin only (see migration 0033's create_poll for the actual
// enforcement; the caps below are just so the form doesn't let someone
// submit a value the server will reject anyway).
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, BarChart3, Plus, Trash2 } from 'lucide-react'
import { createPoll, type PollVoteMode } from './polls'

interface PollComposerModalProps {
  open: boolean
  onClose: () => void
  roomId: string
  /** Staff/Moderator/Admin get up to 168h; Verified-only users get up to 48h. */
  maxDurationHours: number
  onCreated: () => void
}

const DURATION_PRESETS_STAFF = [
  { label: '1 day', hours: 24 },
  { label: '3 days', hours: 72 },
  { label: '7 days', hours: 168 },
]
const DURATION_PRESETS_VERIFIED = [
  { label: '1 day', hours: 24 },
  { label: '2 days', hours: 48 },
]

export default function PollComposerModal({ open, onClose, roomId, maxDurationHours, onCreated }: PollComposerModalProps) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [voteMode, setVoteMode] = useState<PollVoteMode>('single')
  const [durationHours, setDurationHours] = useState(24)
  const [hideResults, setHideResults] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!open) return
    setQuestion('')
    setOptions(['', ''])
    setVoteMode('single')
    setDurationHours(24)
    setHideResults(false)
    setSubmitError('')
  }, [open])

  if (!open) return null

  const presets = maxDurationHours >= 168 ? DURATION_PRESETS_STAFF : DURATION_PRESETS_VERIFIED
  const trimmedOptions = options.map(o => o.trim()).filter(Boolean)
  const canSubmit = question.trim().length > 0 && trimmedOptions.length >= 2 && !submitting

  function updateOption(i: number, value: string) {
    setOptions(prev => prev.map((o, idx) => idx === i ? value : o))
  }

  function addOption() {
    setOptions(prev => prev.length >= 10 ? prev : [...prev, ''])
  }

  function removeOption(i: number) {
    setOptions(prev => prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError('')
    const { error } = await createPoll({
      roomId, question: question.trim(), options: trimmedOptions, voteMode, durationHours, hideResults,
    })
    setSubmitting(false)
    if (error) { setSubmitError(error); return }
    onCreated()
    onClose()
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', zIndex: 100 }} onClick={onClose}>
      <div className="neu-card" style={{ width: '100%', maxWidth: 500, margin: '0 auto', padding: 18, borderRadius: '20px 20px 0 0', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={16} style={{ color: 'var(--accent)' }} />
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>New Poll</p>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
            <X size={18} />
          </button>
        </div>

        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Ask a question…"
          maxLength={300}
          rows={2}
          style={{ width: '100%', resize: 'none', background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', fontSize: 14, color: 'var(--text)', marginBottom: 12 }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
          {options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                value={opt}
                onChange={e => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                maxLength={80}
                style={{ flex: 1, background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '8px 11px', fontSize: 13, color: 'var(--text)' }}
              />
              {options.length > 2 && (
                <button type="button" onClick={() => removeOption(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {options.length < 10 && (
          <button type="button" onClick={addOption} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 12.5, fontWeight: 600, padding: '4px 0', marginBottom: 14 }}>
            <Plus size={13} /> Add option
          </button>
        )}

        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>Voting</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {(['single', 'multi'] as PollVoteMode[]).map(mode => (
            <button key={mode} type="button" onClick={() => setVoteMode(mode)}
              style={{ flex: 1, padding: '8px 0', borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                border: voteMode === mode ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)',
                background: voteMode === mode ? 'rgba(91,156,255,0.14)' : 'var(--surface2)',
                color: voteMode === mode ? 'var(--accent)' : 'var(--text-dim)' }}>
              {mode === 'single' ? 'Pick one' : 'Pick any number'}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>Duration</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {presets.map(p => (
            <button key={p.hours} type="button" onClick={() => setDurationHours(p.hours)}
              style={{ padding: '7px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                border: durationHours === p.hours ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)',
                background: durationHours === p.hours ? 'rgba(91,156,255,0.14)' : 'var(--surface2)',
                color: durationHours === p.hours ? 'var(--accent)' : 'var(--text-dim)' }}>
              {p.label}
            </button>
          ))}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16, cursor: 'pointer' }}>
          <input type="checkbox" checked={hideResults} onChange={e => setHideResults(e.target.checked)} style={{ width: 16, height: 16 }} />
          <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
            Hide results until the poll closes <span style={{ color: 'var(--text-muted)' }}>(Staff/Mod/Admin can still see live results)</span>
          </span>
        </label>

        {submitError && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{submitError}</div>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'default', opacity: canSubmit ? 1 : 0.5 }}
        >
          {submitting ? 'Posting…' : 'Post poll'}
        </button>
      </div>
    </div>,
    document.body
  )
}
