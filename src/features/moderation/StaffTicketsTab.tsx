// src/features/moderation/StaffTicketsTab.tsx
import { useEffect, useState } from 'react'
import {
  Inbox, ChevronDown, ChevronUp, Send, StickyNote, ArrowUpCircle, ArrowDownCircle,
  UserCheck, UserX, CheckCircle2, XCircle, RotateCcw,
} from 'lucide-react'
import { ripple } from '../../shared/lib/ripple'
import { useAuth } from '../auth/useAuth'
import {
  fetchStaffTickets, fetchTicketReplies, fetchTicketNotes,
  claimTicket, unclaimTicket, replyToTicket, addTicketNote,
  setTicketStatus, escalateTicket, deescalateTicket,
  type TicketQueueFilter,
} from './staffTickets'
import {
  SUPPORT_TICKET_STATUS_LABELS, SUPPORT_TICKET_STATUS_COLORS,
  SUPPORT_TICKET_PRIORITY_LABELS, SUPPORT_TICKET_PRIORITY_COLORS,
} from '../support/constants'
import type { StaffSupportTicket, SupportTicketReply, SupportTicketNote, SupportTicketStatus } from '../../shared/types'

const FILTERS: { key: TicketQueueFilter; label: string }[] = [
  { key: 'unclaimed', label: 'Unclaimed' },
  { key: 'mine', label: 'My tickets' },
  { key: 'escalated', label: 'Escalated' },
  { key: 'all', label: 'All' },
]

export default function StaffTicketsTab({ isModOrAdmin }: { isModOrAdmin: boolean }) {
  const { user } = useAuth()
  const [filter, setFilter] = useState<TicketQueueFilter>('unclaimed')
  const [tickets, setTickets] = useState<StaffSupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function load() {
    if (!user) return
    setLoading(true)
    fetchStaffTickets(filter, user.id).then(({ data, error }) => {
      setTickets(data)
      setError(error)
      setLoading(false)
    })
  }

  useEffect(load, [filter, user])

  if (loading) return <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-dim)', fontSize: 13 }}>Loading…</div>

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={(e) => { ripple(e); setFilter(f.key) }}
            className="ripple-wrap"
            style={{
              fontSize: 12, fontWeight: 700, padding: '7px 12px', borderRadius: 9, cursor: 'pointer',
              border: filter === f.key ? '1px solid color-mix(in srgb, var(--accent) 35%, transparent)' : '1px solid var(--border)',
              background: filter === f.key ? 'var(--surface2)' : 'transparent',
              color: filter === f.key ? 'var(--accent)' : 'var(--text-dim)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <div style={errorBox}>{error}</div>}

      {tickets.length === 0 ? (
        <EmptyState text={
          filter === 'unclaimed' ? "No unclaimed tickets — you're all caught up."
            : filter === 'mine' ? "You haven't claimed any tickets yet."
            : filter === 'escalated' ? 'No tickets are currently escalated.'
            : 'No tickets yet.'
        } />
      ) : (
        tickets.map(ticket => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            myUserId={user?.id ?? ''}
            isModOrAdmin={isModOrAdmin}
            expanded={expandedId === ticket.id}
            onToggle={() => setExpandedId(expandedId === ticket.id ? null : ticket.id)}
            onReload={load}
          />
        ))
      )}
    </div>
  )
}

function TicketCard({
  ticket, myUserId, isModOrAdmin, expanded, onToggle, onReload,
}: {
  ticket: StaffSupportTicket
  myUserId: string
  isModOrAdmin: boolean
  expanded: boolean
  onToggle: () => void
  onReload: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [replies, setReplies] = useState<SupportTicketReply[]>([])
  const [notes, setNotes] = useState<SupportTicketNote[]>([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [replyDraft, setReplyDraft] = useState('')
  const [noteDraft, setNoteDraft] = useState('')
  const [escalating, setEscalating] = useState(false)
  const [escalationNote, setEscalationNote] = useState('')

  const isMine = ticket.assigned_to === myUserId
  const canChangeStatus = !ticket.escalated_to_mod || isModOrAdmin

  useEffect(() => {
    if (!expanded) return
    let active = true
    setThreadLoading(true)
    Promise.all([fetchTicketReplies(ticket.id), fetchTicketNotes(ticket.id)]).then(([r, n]) => {
      if (!active) return
      setReplies(r.data)
      setNotes(n.data)
      setThreadLoading(false)
    })
    return () => { active = false }
  }, [expanded, ticket.id])

  async function refreshThread() {
    const [r, n] = await Promise.all([fetchTicketReplies(ticket.id), fetchTicketNotes(ticket.id)])
    setReplies(r.data)
    setNotes(n.data)
  }

  async function handleClaim() {
    setBusy(true); setActionError(null)
    const { error } = await claimTicket(ticket.id)
    setBusy(false)
    if (error) { setActionError(error); return }
    onReload()
  }

  async function handleUnclaim() {
    setBusy(true); setActionError(null)
    const { error } = await unclaimTicket(ticket.id)
    setBusy(false)
    if (error) { setActionError(error); return }
    onReload()
  }

  async function handleReply() {
    if (!replyDraft.trim()) return
    setBusy(true); setActionError(null)
    const { error } = await replyToTicket(ticket.id, replyDraft.trim())
    setBusy(false)
    if (error) { setActionError(error); return }
    setReplyDraft('')
    await refreshThread()
    onReload()
  }

  async function handleAddNote() {
    if (!noteDraft.trim()) return
    setBusy(true); setActionError(null)
    const { error } = await addTicketNote(ticket.id, noteDraft.trim())
    setBusy(false)
    if (error) { setActionError(error); return }
    setNoteDraft('')
    refreshThread()
  }

  async function handleSetStatus(status: SupportTicketStatus) {
    setBusy(true); setActionError(null)
    const { error } = await setTicketStatus(ticket.id, status)
    setBusy(false)
    if (error) { setActionError(error); return }
    onReload()
  }

  async function handleEscalate() {
    if (!escalationNote.trim()) { setActionError('Please add a note explaining why this needs a moderator.'); return }
    setBusy(true); setActionError(null)
    const { error } = await escalateTicket(ticket.id, escalationNote.trim())
    setBusy(false)
    if (error) { setActionError(error); return }
    setEscalating(false)
    setEscalationNote('')
    onReload()
  }

  async function handleDeescalate() {
    setBusy(true); setActionError(null)
    const { error } = await deescalateTicket(ticket.id)
    setBusy(false)
    if (error) { setActionError(error); return }
    onReload()
  }

  return (
    <div style={cardStyle}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
          width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{ticket.subject}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 8 }}>
            @{ticket.user?.username ?? 'unknown'} · {new Date(ticket.created_at).toLocaleString()}
            {ticket.assignee?.username && <> · claimed by @{ticket.assignee.username}</>}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <StatusPill label={SUPPORT_TICKET_STATUS_LABELS[ticket.status]} color={SUPPORT_TICKET_STATUS_COLORS[ticket.status]} />
            <StatusPill label={SUPPORT_TICKET_PRIORITY_LABELS[ticket.priority]} color={SUPPORT_TICKET_PRIORITY_COLORS[ticket.priority]} />
            {ticket.escalated_to_mod && <StatusPill label="Escalated" color="var(--red)" />}
          </div>
        </div>
        {expanded ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
      </button>

      <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, margin: '10px 0' }}>{ticket.message}</div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {!ticket.assigned_to ? (
          <SmallButton onClick={handleClaim} disabled={busy}><UserCheck size={12} /> Claim</SmallButton>
        ) : (isMine || isModOrAdmin) ? (
          <SmallButton onClick={handleUnclaim} disabled={busy}><UserX size={12} /> Unclaim</SmallButton>
        ) : null}

        {canChangeStatus && ticket.status !== 'resolved' && (
          <SmallButton onClick={() => handleSetStatus('resolved')} disabled={busy}><CheckCircle2 size={12} /> Resolve</SmallButton>
        )}
        {canChangeStatus && ticket.status !== 'closed' && (
          <SmallButton onClick={() => handleSetStatus('closed')} disabled={busy}><XCircle size={12} /> Close</SmallButton>
        )}
        {canChangeStatus && (ticket.status === 'resolved' || ticket.status === 'closed') && (
          <SmallButton onClick={() => handleSetStatus('in_progress')} disabled={busy}><RotateCcw size={12} /> Reopen</SmallButton>
        )}

        {!ticket.escalated_to_mod && (
          <SmallButton onClick={() => setEscalating(v => !v)} disabled={busy}>
            <ArrowUpCircle size={12} /> Escalate to moderator
          </SmallButton>
        )}
        {ticket.escalated_to_mod && isModOrAdmin && (
          <SmallButton onClick={handleDeescalate} disabled={busy}>
            <ArrowDownCircle size={12} /> Send back to staff
          </SmallButton>
        )}
      </div>

      {ticket.escalated_to_mod && ticket.escalation_note && (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: 'rgba(255,79,79,0.07)', border: '1px solid rgba(255,79,79,0.2)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', marginBottom: 3 }}>Escalation note</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{ticket.escalation_note}</div>
        </div>
      )}

      {escalating && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <input
            value={escalationNote}
            onChange={e => setEscalationNote(e.target.value)}
            placeholder="Why does this need a moderator? (required)"
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12.5 }}
          />
          <SmallButton danger onClick={handleEscalate} disabled={busy}>Send</SmallButton>
        </div>
      )}

      {actionError && <div style={{ ...errorBox, marginTop: 10, marginBottom: 0 }}>{actionError}</div>}

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          {threadLoading ? (
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Loading conversation…</div>
          ) : (
            <>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 8 }}>Conversation</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {replies.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No replies yet.</div>}
                {replies.map(r => (
                  <div key={r.id} style={{
                    padding: '8px 11px', borderRadius: 10, border: '1px solid var(--border)',
                    background: r.is_staff ? 'var(--surface2)' : 'color-mix(in srgb, var(--accent) 10%, transparent)',
                  }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: r.is_staff ? 'var(--accent)' : 'var(--text-dim)', marginBottom: 3 }}>
                      {r.is_staff ? `Staff (@${r.author?.username ?? '?'})` : `@${r.author?.username ?? 'user'}`}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{r.body}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <textarea
                  value={replyDraft}
                  onChange={e => setReplyDraft(e.target.value)}
                  placeholder="Reply to the user…"
                  rows={2}
                  style={{ flex: 1, resize: 'vertical', minHeight: 38, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12.5, padding: '8px 10px', fontFamily: 'inherit' }}
                />
                <SmallButton onClick={handleReply} disabled={busy || !replyDraft.trim()}><Send size={12} /> Send</SmallButton>
              </div>

              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 8 }}>Internal notes (staff only)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {notes.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No internal notes yet.</div>}
                {notes.map(n => (
                  <div key={n.id} style={{ fontSize: 12, color: 'var(--text-dim)', padding: '7px 10px', borderRadius: 8, background: 'var(--surface2)' }}>
                    <span style={{ fontWeight: 700 }}>@{n.author?.username ?? '?'}:</span> {n.body}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={noteDraft}
                  onChange={e => setNoteDraft(e.target.value)}
                  placeholder="Leave a note for other staff…"
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12.5 }}
                />
                <SmallButton onClick={handleAddNote} disabled={busy || !noteDraft.trim()}><StickyNote size={12} /> Add</SmallButton>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Local UI helpers (mirrors ModerationPanel's styling; not exported from there) ──

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color, background: `${color}1a`, border: `1px solid ${color}40`,
      borderRadius: 999, padding: '3px 9px', whiteSpace: 'nowrap', textTransform: 'capitalize',
    }}>
      {label}
    </span>
  )
}

function SmallButton({ children, onClick, danger, disabled }: {
  children: React.ReactNode
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={(e) => { if (!disabled) { ripple(e); onClick?.() } }}
      disabled={disabled}
      className="ripple-wrap"
      style={{
        display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
        padding: '8px 12px', borderRadius: 9, border: '1px solid var(--border)',
        background: danger ? 'rgba(255,79,79,0.1)' : 'var(--surface2)',
        color: danger ? 'var(--red)' : 'var(--text)',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '48px 20px', textAlign: 'center' }}>
      <Inbox size={28} color="var(--text-muted)" />
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{text}</div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
  padding: '16px 18px', marginBottom: 12,
  boxShadow: 'var(--elev-raise-sm)',
}

const errorBox: React.CSSProperties = {
  background: 'rgba(255,79,79,0.08)', border: '1px solid rgba(255,79,79,0.25)', borderRadius: 12,
  padding: '12px 16px', color: '#ff8080', fontSize: 13, marginBottom: 16,
}
