// src/features/chat/PollMessage.tsx
// Renders a poll message: live vote bars (when visible), voting UI, and an
// End poll control for the creator or Staff/Moderator/Admin. Global Chat
// only — see migration 0033 for why polls can't exist in DMs.
import { useCallback, useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { fetchPoll, votePoll, endPoll, type PollData } from './polls'

interface PollMessageProps {
  pollId: string
  myId: string | null
  isStaff: boolean
  formatTime: (iso: string) => string
  /** Bump this to force a refetch — used after a realtime poll_votes/polls event. */
  refreshToken?: number
}

export default function PollMessage({ pollId, myId, isStaff, formatTime, refreshToken }: PollMessageProps) {
  const [poll, setPoll] = useState<PollData | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingMulti, setPendingMulti] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const data = await fetchPoll(pollId, myId, isStaff)
    setPoll(data)
    setPendingMulti(data?.myVotes ?? [])
    setLoading(false)
  }, [pollId, myId, isStaff])

  useEffect(() => { load() }, [load, refreshToken])

  if (loading) {
    return <div style={{ margin: '10px 0', padding: '12px 14px', borderRadius: 14, background: 'var(--surface2)', fontSize: 12.5, color: 'var(--text-muted)' }}>Loading poll…</div>
  }
  if (!poll) return null

  const closed = poll.closed_at !== null || new Date(poll.closes_at) <= new Date()
  const canEnd = !!myId && (poll.creator_id === myId || isStaff) && !closed

  async function handleSingleVote(optionId: string) {
    if (closed || busy || !poll) return
    setBusy(true); setError(null)
    const { error: err } = await votePoll(poll.id, [optionId])
    setBusy(false)
    if (err) { setError(err); return }
    load()
  }

  function toggleMulti(optionId: string) {
    if (closed || busy) return
    setPendingMulti(prev => prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId])
  }

  async function submitMulti() {
    if (closed || busy || pendingMulti.length === 0 || !poll) return
    setBusy(true); setError(null)
    const { error: err } = await votePoll(poll.id, pendingMulti)
    setBusy(false)
    if (err) { setError(err); return }
    load()
  }

  async function handleEnd() {
    if (busy || !poll) return
    setBusy(true)
    await endPoll(poll.id)
    setBusy(false)
    load()
  }

  const multiChanged = poll.vote_mode === 'multi' &&
    (pendingMulti.length !== poll.myVotes.length || pendingMulti.some(id => !poll.myVotes.includes(id)))

  return (
    <div style={{ margin: '10px 0', padding: '12px 14px', borderRadius: 14, background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.08)', maxWidth: 340 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <BarChart3 size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>
          {closed ? 'Poll closed' : 'Poll'} · {poll.vote_mode === 'multi' ? 'pick any number' : 'pick one'}
        </span>
      </div>

      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, lineHeight: 1.35 }}>{poll.question}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {poll.options.map(opt => {
          const count = poll.voteCounts[opt.id] ?? 0
          const pct = poll.resultsVisible && poll.totalVotes > 0 ? Math.round((count / poll.totalVotes) * 100) : 0
          const selected = poll.vote_mode === 'single' ? poll.myVotes.includes(opt.id) : pendingMulti.includes(opt.id)
          return (
            <button
              key={opt.id}
              type="button"
              disabled={closed || busy}
              onClick={() => poll.vote_mode === 'single' ? handleSingleVote(opt.id) : toggleMulti(opt.id)}
              style={{
                position: 'relative', textAlign: 'left', padding: '8px 10px', borderRadius: 9, overflow: 'hidden',
                border: selected ? '1.5px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)',
                background: 'var(--surface)', cursor: closed || busy ? 'default' : 'pointer',
              }}
            >
              {poll.resultsVisible && (
                <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: 'rgba(91,156,255,0.14)', transition: 'width 0.3s' }} />
              )}
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: selected ? 700 : 500 }}>{selected ? '✓ ' : ''}{opt.label}</span>
                {poll.resultsVisible && <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{pct}% ({count})</span>}
              </div>
            </button>
          )
        })}
      </div>

      {poll.vote_mode === 'multi' && !closed && (
        <button
          type="button"
          onClick={submitMulti}
          disabled={busy || pendingMulti.length === 0 || !multiChanged}
          style={{ marginTop: 8, width: '100%', padding: '7px 0', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: busy || pendingMulti.length === 0 || !multiChanged ? 'default' : 'pointer', opacity: busy || pendingMulti.length === 0 || !multiChanged ? 0.5 : 1 }}
        >
          {poll.myVotes.length > 0 ? 'Update vote' : 'Vote'}
        </button>
      )}

      {error && <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 6 }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 9, gap: 8 }}>
        <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
          {poll.resultsVisible ? `${poll.totalVotes} vote${poll.totalVotes === 1 ? '' : 's'}` : 'Results hidden until the poll closes'}
          {' · '}{closed ? 'Ended' : `Closes ${formatTime(poll.closes_at)}`}
        </span>
        {canEnd && (
          <button type="button" onClick={handleEnd} disabled={busy} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>
            End poll
          </button>
        )}
      </div>
    </div>
  )
}
