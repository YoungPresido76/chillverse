// src/features/moderation/ModerationPanel.tsx
import { useEffect, useState } from 'react'
import { ShieldAlert, Flag, Users as UsersIcon, ScrollText, Search, Ban, ShieldCheck, Trash2, Bell, Eye, BadgeCheck, Award, UserCog, Ticket, ArrowUpCircle, SlidersHorizontal, Settings, Plus, X, History, NotebookPen, CheckSquare, Square } from 'lucide-react'
import { ripple } from '../../shared/lib/ripple'
import { useModRole } from './useModRole'
import { useAuth } from '../auth/useAuth'
import {
  fetchOpenReports, getReportContext, reviewReport, escalateReport, searchUserByUsername, searchStaffUsers,
  banUser, unbanUser, setUserRole, setVerified, deleteMessage, deletePost, deleteComment,
  fetchModerationLog, fetchStrikes, fetchUnresolvedAlerts, resolveAlert, escalateAlert, unhideContent,
  bulkDismissReports, bulkDeleteAndActionReports, bulkBanReportedUsers,
  fetchBannedTerms, addBannedTerm, updateBannedTerm, deleteBannedTerm, BANNED_TERM_CATEGORY_LABELS,
  fetchModerationSettings, updateStrikeThreshold,
  fetchUserHistory, addUserNote,
  type ContentReport, type ModerationLogEntry, type StaffRole, type Strike, type StaffAlert, type StaffUserSearchRow,
  type BannedTerm, type BannedTermCategory, type UserHistoryEntry,
} from './moderation'
import { fetchStaffTickets } from './staffTickets'
import StaffTicketsTab from './StaffTicketsTab'
import { fetchAdminUserList, type AdminUserRow } from '../admin/adminStats'
import { REPORT_REASON_LABELS, SYSTEM_REPORT_REASON_LABEL } from '../safety/reports'
import { getAllBadges, getPlayerBadges, grantManualBadge, revokeManualBadge, setBadgeAvailability, BADGE_RARITY_COLOR, type BadgeDef } from '../badges/badges'
import { BadgeIcon } from '../badges/badgeIcons'
import Avatar from '../../shared/components/Avatar'
import ScrollFadeRow from '../../shared/components/ScrollFadeRow'

type Tab = 'alerts' | 'reports' | 'tickets' | 'users' | 'badges' | 'filters' | 'settings' | 'roles' | 'log'

const REASON_COLORS: Record<ContentReport['status'], string> = {
  open: 'var(--accent2)',
  reviewed: '#5b9cff',
  actioned: '#4fd18a',
  dismissed: 'var(--text-muted)',
}

export default function ModerationPanel() {
  const { role, isStaff, isAdmin, isModOrAdmin, loading } = useModRole()
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('alerts')
  const [alertCount, setAlertCount] = useState(0)
  const [ticketCount, setTicketCount] = useState(0)

  useEffect(() => {
    if (!isStaff) return
    fetchUnresolvedAlerts().then(({ data }) => setAlertCount(data.length))
  }, [isStaff])

  useEffect(() => {
    if (!isStaff || !user) return
    fetchStaffTickets('unclaimed', user.id).then(({ data }) => setTicketCount(data.length))
  }, [isStaff, user])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)', fontSize: 13.5 }}>Loading…</div>
  }

  if (!isStaff) {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center' }}>
        <ShieldAlert size={32} color="var(--text-muted)" style={{ marginBottom: 12 }} />
        <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>Staff only</h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-dim)' }}>This page is for moderators and admins.</p>
      </div>
    )
  }

  const tabs: { key: Tab; label: string; icon: typeof Flag }[] = [
    { key: 'alerts', label: 'Alerts', icon: Bell },
    { key: 'reports', label: 'Reports', icon: Flag },
    { key: 'tickets', label: 'Tickets', icon: Ticket },
    { key: 'users', label: 'Users', icon: UsersIcon },
    { key: 'badges', label: 'Badges', icon: Award },
    ...(isAdmin ? [{ key: 'filters' as Tab, label: 'Filters', icon: SlidersHorizontal }] : []),
    ...(isAdmin ? [{ key: 'settings' as Tab, label: 'Settings', icon: Settings }] : []),
    ...(isAdmin ? [{ key: 'roles' as Tab, label: 'Roles', icon: UserCog }] : []),
    { key: 'log', label: 'Audit log', icon: ScrollText },
  ]

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
        <ShieldCheck size={22} color="var(--accent)" />
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>Moderation</h1>
        <span style={{
          fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
          border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)', borderRadius: 999, padding: '3px 10px', marginLeft: 2,
        }}>
          {isAdmin ? 'Admin' : role === 'staff' ? 'Staff' : 'Moderator'}
        </span>
      </div>

      <ScrollFadeRow style={{ marginBottom: 20 }}>
        {tabs.map(t => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={(e) => { ripple(e); setTab(t.key) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                padding: '9px 14px', borderRadius: 11, cursor: 'pointer', whiteSpace: 'nowrap',
                background: active ? 'var(--surface2)' : 'transparent',
                border: active ? '1px solid color-mix(in srgb, var(--accent) 35%, transparent)' : '1px solid rgba(255,255,255,0.04)',
                color: active ? 'var(--accent)' : 'var(--text-dim)',
                fontSize: 12.5, fontWeight: 800,
              }}
            >
              <Icon size={13} /> {t.label}
              {t.key === 'alerts' && alertCount > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 800, color: '#fff', background: 'var(--red)',
                  borderRadius: 999, minWidth: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px',
                }}>
                  {alertCount}
                </span>
              )}
              {t.key === 'tickets' && ticketCount > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 800, color: '#fff', background: 'var(--accent)',
                  borderRadius: 999, minWidth: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px',
                }}>
                  {ticketCount}
                </span>
              )}
            </button>
          )
        })}
      </ScrollFadeRow>

      {tab === 'alerts' && <AlertsTab onResolved={() => setAlertCount(c => Math.max(0, c - 1))} isModOrAdmin={isModOrAdmin} />}
      {tab === 'reports' && <ReportsTab isModOrAdmin={isModOrAdmin} />}
      {tab === 'tickets' && <StaffTicketsTab isModOrAdmin={isModOrAdmin} />}
      {tab === 'users' && <UsersTab isAdmin={isAdmin} isModOrAdmin={isModOrAdmin} />}
      {tab === 'badges' && <BadgesTab />}
      {tab === 'filters' && isAdmin && <FiltersTab />}
      {tab === 'settings' && isAdmin && <SettingsTab />}
      {tab === 'roles' && isAdmin && <RolesTab />}
      {tab === 'log' && <LogTab />}
    </div>
  )
}

// ── Alerts ──────────────────────────────────────────────────────────────

const STRIKE_CATEGORY_LABELS: Record<string, string> = {
  hate_speech: 'Hate speech',
  threat_of_violence: 'Threat of violence',
  self_harm_directed: 'Self-harm language directed at someone',
  doxxing: 'Doxxing',
  illegal_activity: 'Illegal activity solicitation',
  phishing_scam: 'Phishing or scam content',
  profanity: 'Profanity',
  personal_info_exposure: 'Personal info exposure (phone/email/key)',
}

function AlertsTab({ onResolved, isModOrAdmin }: { onResolved: () => void; isModOrAdmin: boolean }) {
  const [alerts, setAlerts] = useState<StaffAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [strikes, setStrikes] = useState<Strike[]>([])
  const [strikesLoading, setStrikesLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [banReason, setBanReason] = useState('')
  const [escalating, setEscalating] = useState(false)
  const [escalationNote, setEscalationNote] = useState('')

  function load() {
    setLoading(true)
    fetchUnresolvedAlerts().then(({ data, error }) => {
      setAlerts(data)
      setError(error)
      setLoading(false)
    })
  }

  useEffect(load, [])

  async function toggleExpand(alert: StaffAlert) {
    if (expanded === alert.id) { setExpanded(null); return }
    setExpanded(alert.id)
    setBanReason('')
    setEscalating(false)
    setEscalationNote('')
    setStrikesLoading(true)
    const { data } = await fetchStrikes(alert.user_id)
    setStrikes(data)
    setStrikesLoading(false)
  }

  async function handleDismiss(alert: StaffAlert) {
    setBusy(true)
    const { error } = await resolveAlert(alert.id)
    setBusy(false)
    if (error) { setError(error); return }
    setAlerts(a => a.filter(x => x.id !== alert.id))
    onResolved()
  }

  async function handleBan(alert: StaffAlert, durationHours: number | null) {
    if (!banReason.trim()) { setError('Please enter a reason.'); return }
    setBusy(true)
    const { error } = await banUser(alert.user_id, banReason.trim(), durationHours)
    if (error) { setBusy(false); setError(error); return }
    const { error: resolveError } = await resolveAlert(alert.id)
    setBusy(false)
    if (resolveError) { setError(resolveError); return }
    setError(null)
    setAlerts(a => a.filter(x => x.id !== alert.id))
    onResolved()
  }

  async function handleEscalate(alert: StaffAlert) {
    if (!escalationNote.trim()) { setError('Please add a note explaining why this needs a moderator.'); return }
    setBusy(true)
    const { error } = await escalateAlert(alert.id, escalationNote.trim())
    setBusy(false)
    if (error) { setError(error); return }
    setError(null)
    setEscalating(false)
    setEscalationNote('')
    setAlerts(a => a.map(x => (x.id === alert.id ? { ...x, escalated: true } : x)))
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-dim)', fontSize: 13 }}>Loading…</div>
  if (error) return <div style={errorBox}>{error}</div>
  if (alerts.length === 0) return <EmptyState icon={Bell} text="No pending alerts — nobody has crossed the strike threshold." />

  return (
    <div>
      {alerts.map(a => {
        // Plain staff can view/dismiss a not-yet-escalated alert, but any real
        // action (ban) — or closing one out once it's been escalated — needs
        // a moderator/admin.
        const canDismiss = isModOrAdmin || !a.escalated
        return (
        <div key={a.id} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>@{a.user?.username ?? 'unknown'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {a.strike_count} strikes · flagged {new Date(a.created_at).toLocaleString()}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {a.escalated && <StatusPill label="Escalated" color="var(--red)" />}
              <StatusPill label={`${a.strike_count} strikes`} color="var(--red)" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <SmallButton onClick={() => toggleExpand(a)}>
              <Eye size={12} /> {expanded === a.id ? 'Hide history' : 'View strike history'}
            </SmallButton>
            {canDismiss && (
              <SmallButton onClick={() => handleDismiss(a)} disabled={busy}>Dismiss (no action)</SmallButton>
            )}
            {!isModOrAdmin && !a.escalated && (
              <SmallButton onClick={() => setEscalating(v => !v)} disabled={busy}>
                <ArrowUpCircle size={12} /> Escalate to moderator
              </SmallButton>
            )}
          </div>

          {a.escalated && a.escalation_note && (
            <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: 'rgba(255,79,79,0.07)', border: '1px solid rgba(255,79,79,0.2)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', marginBottom: 3 }}>Escalation note</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{a.escalation_note}</div>
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
              <SmallButton danger onClick={() => handleEscalate(a)} disabled={busy}>Send</SmallButton>
            </div>
          )}

          {expanded === a.id && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: 'var(--surface2)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 8 }}>Strike history</div>
              {strikesLoading ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading…</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {strikes.map(s => (
                    <div key={s.id} style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                      {STRIKE_CATEGORY_LABELS[s.category] ?? s.category}
                      <span style={{ color: 'var(--text-muted)' }}> · {s.target_type} · {new Date(s.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {isModOrAdmin ? (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 8 }}>Take action</div>
                  <input
                    value={banReason}
                    onChange={e => setBanReason(e.target.value)}
                    placeholder="Reason (required)"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12.5, marginBottom: 8 }}
                  />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <SmallButton danger onClick={() => handleBan(a, 168)} disabled={busy}>
                      <Ban size={12} /> Suspend 7 days
                    </SmallButton>
                    <SmallButton danger onClick={() => handleBan(a, null)} disabled={busy}>
                      <Ban size={12} /> Ban permanently
                    </SmallButton>
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                  Bans require a moderator — use "Escalate to moderator" above to hand this off.
                </p>
              )}
            </div>
          )}
        </div>
        )
      })}
    </div>
  )
}

// ── Reports ─────────────────────────────────────────────────────────────

function ReportsTab({ isModOrAdmin }: { isModOrAdmin: boolean }) {
  const [reports, setReports] = useState<ContentReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [context, setContext] = useState<Record<string, unknown> | null>(null)
  const [contextLoading, setContextLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [escalatingId, setEscalatingId] = useState<string | null>(null)
  const [escalationNote, setEscalationNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBanReason, setBulkBanReason] = useState('')
  const [bulkBanning, setBulkBanning] = useState(false)

  function load() {
    setLoading(true)
    fetchOpenReports().then(({ data, error }) => {
      setReports(data)
      setError(error)
      setLoading(false)
      setSelected(new Set())
    })
  }

  useEffect(load, [])

  function toggleSelected(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const openReports = reports.filter(r => r.status === 'open')
  const selectedReports = openReports.filter(r => selected.has(r.id))
  const selectedUserReports = selectedReports.filter(r => r.target_type === 'user')
  const selectedContentReports = selectedReports.filter(r => r.target_type !== 'user')
  // Staff can only delete-and-action post/comment reports directly (matches the
  // mod_delete_post/mod_delete_comment scope) — mod/admin keep the full content set.
  const selectedActionableReports = isModOrAdmin
    ? selectedContentReports
    : selectedReports.filter(r => r.target_type === 'post' || r.target_type === 'comment')

  async function handleBulkDismiss() {
    if (selected.size === 0) return
    setBusy(true)
    const { count, error } = await bulkDismissReports([...selected])
    setBusy(false)
    if (error) { setActionMsg(error); return }
    setActionMsg(`Dismissed ${count} report${count === 1 ? '' : 's'}.`)
    load()
  }

  async function handleBulkDeleteAndAction() {
    if (selectedActionableReports.length === 0) return
    setBusy(true)
    const { succeeded, failed } = await bulkDeleteAndActionReports(selectedActionableReports)
    setBusy(false)
    setActionMsg(failed.length > 0
      ? `Actioned ${succeeded.length}, failed on ${failed.length}.`
      : `Actioned ${succeeded.length} report${succeeded.length === 1 ? '' : 's'}.`)
    load()
  }

  async function handleBulkBan() {
    if (selectedUserReports.length === 0) return
    if (!bulkBanReason.trim()) { setActionMsg('Please enter a reason.'); return }
    setBulkBanning(true)
    const { succeeded, failed } = await bulkBanReportedUsers(selectedUserReports, bulkBanReason.trim(), null)
    setBulkBanning(false)
    setBulkBanReason('')
    setActionMsg(failed.length > 0
      ? `Banned ${succeeded.length}, failed on ${failed.length}.`
      : `Banned ${succeeded.length} user${succeeded.length === 1 ? '' : 's'}.`)
    load()
  }

  async function toggleExpand(report: ContentReport) {
    if (expanded === report.id) { setExpanded(null); setContext(null); return }
    setExpanded(report.id)
    setContext(null)
    setContextLoading(true)
    const { data } = await getReportContext(report.id)
    setContext(data)
    setContextLoading(false)
  }

  async function handleReview(id: string, status: 'reviewed' | 'actioned' | 'dismissed') {
    const { error } = await reviewReport(id, status)
    if (error) { setActionMsg(error); return }
    setActionMsg(null)
    load()
  }

  async function handleDeleteTarget(report: ContentReport) {
    let result: { error: string | null }
    if (report.target_type === 'message') result = await deleteMessage(report.target_id, 'Deleted from report review')
    else if (report.target_type === 'post') result = await deletePost(report.target_id, 'Deleted from report review')
    else if (report.target_type === 'comment') result = await deleteComment(report.target_id, 'Deleted from report review')
    else { setActionMsg('User reports are actioned via the Users tab (ban).'); return }

    if (result.error) { setActionMsg(result.error); return }
    await handleReview(report.id, 'actioned')
  }

  async function handleUnhide(report: ContentReport) {
    if (report.target_type === 'user') return
    const { error } = await unhideContent(report.target_type, report.target_id)
    if (error) { setActionMsg(error); return }
    setActionMsg(null)
    await handleReview(report.id, 'dismissed')
  }

  async function handleEscalate(report: ContentReport) {
    if (!escalationNote.trim()) { setActionMsg('Please add a note explaining why this needs a moderator.'); return }
    setBusy(true)
    const { error } = await escalateReport(report.id, escalationNote.trim())
    setBusy(false)
    if (error) { setActionMsg(error); return }
    setActionMsg(null)
    setEscalatingId(null)
    setEscalationNote('')
    load()
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-dim)', fontSize: 13 }}>Loading…</div>
  if (error) return <div style={errorBox}>{error}</div>
  if (reports.length === 0) return <EmptyState icon={Flag} text="No reports yet." />

  return (
    <div>
      {actionMsg && <div style={errorBox}>{actionMsg}</div>}

      {openReports.length > 0 && (
        <div style={{ ...cardStyle, padding: '12px 14px', background: 'var(--surface2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: selected.size > 0 ? 10 : 0 }}>
            <SmallButton onClick={() => setSelected(selected.size === openReports.length ? new Set() : new Set(openReports.map(r => r.id)))}>
              {selected.size === openReports.length ? <CheckSquare size={12} /> : <Square size={12} />}
              {selected.size === openReports.length ? 'Deselect all' : 'Select all'}
            </SmallButton>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selected.size} selected</span>
          </div>

          {selected.size > 0 && (
            <div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <SmallButton onClick={handleBulkDismiss} disabled={busy}>Dismiss selected</SmallButton>
                {selectedActionableReports.length > 0 && (
                  <SmallButton danger onClick={handleBulkDeleteAndAction} disabled={busy}>
                    <Trash2 size={12} /> Delete & action {selectedActionableReports.length} content
                  </SmallButton>
                )}
              </div>
              {isModOrAdmin && selectedUserReports.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input
                    value={bulkBanReason}
                    onChange={e => setBulkBanReason(e.target.value)}
                    placeholder={`Reason to ban ${selectedUserReports.length} reported user${selectedUserReports.length === 1 ? '' : 's'}…`}
                    style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12.5 }}
                  />
                  <SmallButton danger onClick={handleBulkBan} disabled={bulkBanning}>
                    <Ban size={12} /> Ban {selectedUserReports.length}
                  </SmallButton>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {reports.map(r => (
        <div key={r.id} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 10, minWidth: 0 }}>
              {r.status === 'open' && (
                <button
                  type="button"
                  onClick={() => toggleSelected(r.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2, color: selected.has(r.id) ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }}
                >
                  {selected.has(r.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>
                  {r.reason === 'auto_flagged' ? SYSTEM_REPORT_REASON_LABEL : (REPORT_REASON_LABELS[r.reason as keyof typeof REPORT_REASON_LABELS] ?? r.reason)}
                  <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 8 }}>
                    on a {r.target_type}
                  </span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>
                  Reported by {r.reporter?.username ?? (r.reason === 'auto_flagged' ? 'System (word filter)' : 'unknown')} · {new Date(r.created_at).toLocaleString()}
                </div>
                {r.details && <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 6 }}>{r.details}</div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {r.escalated_to_mod && <StatusPill label="Escalated" color="var(--red)" />}
              <StatusPill label={r.status} color={REASON_COLORS[r.status]} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <SmallButton onClick={() => toggleExpand(r)}>{expanded === r.id ? 'Hide content' : 'View content'}</SmallButton>
            {r.target_type !== 'user' && (
              <SmallButton onClick={() => handleUnhide(r)}>
                <Eye size={12} /> Unhide
              </SmallButton>
            )}
            {r.status === 'open' && (
              <>
                <SmallButton onClick={() => handleReview(r.id, 'dismissed')}>Dismiss</SmallButton>
                {isModOrAdmin || r.target_type === 'post' || r.target_type === 'comment' ? (
                  <SmallButton danger onClick={() => handleDeleteTarget(r)}>
                    <Trash2 size={12} /> Delete & action
                  </SmallButton>
                ) : !r.escalated_to_mod ? (
                  <SmallButton onClick={() => { setEscalatingId(escalatingId === r.id ? null : r.id); setEscalationNote('') }}>
                    <ArrowUpCircle size={12} /> Escalate to moderator
                  </SmallButton>
                ) : null}
              </>
            )}
          </div>

          {r.escalated_to_mod && r.escalation_note && (
            <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: 'rgba(255,79,79,0.07)', border: '1px solid rgba(255,79,79,0.2)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', marginBottom: 3 }}>Escalation note</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{r.escalation_note}</div>
            </div>
          )}

          {escalatingId === r.id && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <input
                value={escalationNote}
                onChange={e => setEscalationNote(e.target.value)}
                placeholder="Why does this need a moderator? (required)"
                style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12.5 }}
              />
              <SmallButton danger onClick={() => handleEscalate(r)} disabled={busy}>Send</SmallButton>
            </div>
          )}

          {expanded === r.id && (
            <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: 'var(--surface2)', fontSize: 12.5, color: 'var(--text-dim)' }}>
              {contextLoading ? 'Loading…' : (
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'inherit' }}>
                  {JSON.stringify(context, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Users ───────────────────────────────────────────────────────────────

function UsersTab({ isAdmin, isModOrAdmin }: { isAdmin: boolean; isModOrAdmin: boolean }) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [suggestions, setSuggestions] = useState<StaffUserSearchRow[]>([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [result, setResult] = useState<Awaited<ReturnType<typeof searchUserByUsername>>['data']>(null)
  const [error, setError] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [banReason, setBanReason] = useState('')
  const [banHours, setBanHours] = useState<'' | number>('')
  const [busy, setBusy] = useState(false)
  const [manualBadges, setManualBadges] = useState<BadgeDef[]>([])
  const [ownedBadgeIds, setOwnedBadgeIds] = useState<Set<string>>(new Set())
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<UserHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteBusy, setNoteBusy] = useState(false)

  useEffect(() => {
    getAllBadges().then(all => setManualBadges(all.filter(b => b.grant_type === 'manual')))
  }, [])

  useEffect(() => {
    if (!result) { setOwnedBadgeIds(new Set()); return }
    getPlayerBadges(result.user_id).then(rows => setOwnedBadgeIds(new Set(rows.map(r => r.badge_id))))
  }, [result])

  // Switching to a different user closes any open history panel rather
  // than showing stale data while the new one loads.
  useEffect(() => {
    setHistoryOpen(false)
    setHistory([])
    setNoteText('')
  }, [result?.user_id])

  async function toggleHistory() {
    if (!result) return
    if (historyOpen) { setHistoryOpen(false); return }
    setHistoryOpen(true)
    setHistoryLoading(true)
    const { data, error } = await fetchUserHistory(result.user_id)
    if (error) setError(error)
    setHistory(data)
    setHistoryLoading(false)
  }

  async function handleAddNote() {
    if (!result || !noteText.trim()) return
    setNoteBusy(true)
    const { error } = await addUserNote(result.user_id, noteText.trim())
    setNoteBusy(false)
    if (error) { setError(error); return }
    setError(null)
    setNoteText('')
    setHistoryLoading(true)
    const { data } = await fetchUserHistory(result.user_id)
    setHistory(data)
    setHistoryLoading(false)
  }

  // Live typeahead: debounce keystrokes, then fetch a short list of
  // partial matches — the moderator doesn't need to know the full,
  // exact username up front, just enough to spot the right person in
  // the dropdown below the input.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    let active = true
    if (!debouncedQuery.trim()) {
      setSuggestions([])
      setSearching(false)
      return
    }
    setSearching(true)
    searchStaffUsers(debouncedQuery).then(({ data, error }) => {
      if (!active) return
      setSuggestions(data)
      if (error) setError(error)
      setSearching(false)
    })
    return () => { active = false }
  }, [debouncedQuery])

  // Picking a suggestion resolves the exact user detail (ban status, role,
  // owned badges, etc.) that the rest of this tab already knows how to
  // render — the partial-match RPC only returns enough to show a row.
  async function selectSuggestion(row: StaffUserSearchRow) {
    setSuggestionsOpen(false)
    setSuggestions([])
    setQuery(row.username)
    setSearching(true)
    const { data, error } = await searchUserByUsername(row.username)
    setResult(data)
    setError(error)
    setSearching(false)
  }

  async function refresh() {
    if (!result) return
    const { data } = await searchUserByUsername(result.username)
    setResult(data)
  }

  async function handleBan() {
    if (!result) return
    if (!banReason.trim()) { setError('Please enter a reason.'); return }
    setBusy(true)
    const { error } = await banUser(result.user_id, banReason.trim(), banHours === '' ? null : Number(banHours))
    setBusy(false)
    if (error) { setError(error); return }
    setError(null)
    setBanReason('')
    setBanHours('')
    refresh()
  }

  async function handleUnban() {
    if (!result) return
    setBusy(true)
    const { error } = await unbanUser(result.user_id)
    setBusy(false)
    if (error) { setError(error); return }
    refresh()
  }

  async function handleSetRole(role: StaffRole) {
    if (!result) return
    setBusy(true)
    const { error } = await setUserRole(result.user_id, role)
    setBusy(false)
    if (error) { setError(error); return }
    refresh()
  }

  async function handleSetVerified(verified: boolean) {
    if (!result) return
    setBusy(true)
    const { error } = await setVerified(result.user_id, verified)
    setBusy(false)
    if (error) { setError(error); return }
    refresh()
  }

  async function handleGrantBadge(badgeId: string) {
    if (!result) return
    setBusy(true)
    const { error } = await grantManualBadge(result.user_id, badgeId)
    setBusy(false)
    if (error) { setError(error.message ?? 'Could not grant badge.'); return }
    setOwnedBadgeIds(prev => new Set(prev).add(badgeId))
  }

  async function handleRevokeBadge(badgeId: string) {
    if (!result) return
    setBusy(true)
    const { error } = await revokeManualBadge(result.user_id, badgeId)
    setBusy(false)
    if (error) { setError(error.message ?? 'Could not revoke badge.'); return }
    setOwnedBadgeIds(prev => { const next = new Set(prev); next.delete(badgeId); return next })
  }

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 18 }}>
        <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          value={query}
          onChange={e => {
            const v = e.target.value
            setQuery(v)
            setSuggestionsOpen(true)
            if (!v.trim()) { setResult(null); setError(null) }
          }}
          onFocus={() => { if (suggestions.length > 0) setSuggestionsOpen(true) }}
          onBlur={() => { setTimeout(() => setSuggestionsOpen(false), 150) }}
          placeholder="Search by username or display name…"
          style={{
            width: '100%', padding: '10px 12px 10px 34px', borderRadius: 10, border: '1px solid var(--border)',
            background: 'var(--surface2)', color: 'var(--text)', fontSize: 13,
          }}
        />
        {searching && (
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-muted)' }}>
            Searching…
          </span>
        )}

        {suggestionsOpen && query.trim() && (
          <div
            className="neu-card"
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 20,
              borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)',
              boxShadow: '0 12px 28px rgba(0,0,0,0.35), 4px 4px 12px var(--neu-dark)',
              maxHeight: 300, overflowY: 'auto', padding: 6,
            }}
          >
            {suggestions.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '14px 10px' }}>
                {searching ? 'Searching…' : 'No matches.'}
              </p>
            ) : (
              suggestions.map(u => (
                <button
                  key={u.user_id}
                  type="button"
                  onMouseDown={() => selectSuggestion(u)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left',
                    borderRadius: 9, padding: '7px 8px', cursor: 'pointer', background: 'transparent', border: 'none',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <Avatar src={u.avatar} name={u.display_name || u.username} size={26} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="flex items-center gap-1.5">
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.display_name || u.username}
                      </span>
                      {u.is_banned && <ShieldAlert size={10} style={{ color: 'var(--red)', flexShrink: 0 }} />}
                    </div>
                    <p style={{ fontSize: 10.5, color: 'var(--text-muted)', margin: '1px 0 0' }}>@{u.username}</p>
                  </div>
                  <RoleBadge role={u.role} />
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {error && <div style={errorBox}>{error}</div>}

      {result && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{result.display_name || result.username}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{result.username}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <RoleBadge role={result.role} />
              {result.is_verified && <StatusPill label="verified" color="#5b9cff" />}
              {result.is_banned && <StatusPill label="banned" color="var(--red)" />}
              <SmallButton onClick={toggleHistory}>
                <History size={12} /> {historyOpen ? 'Hide history' : 'History'}
              </SmallButton>
            </div>
          </div>

          {result.is_banned && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-dim)' }}>
              Reason: {result.ban_reason || '—'}
              {result.banned_until && <> · Until {new Date(result.banned_until).toLocaleString()}</>}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {isModOrAdmin && result.is_banned ? (
              <SmallButton onClick={handleUnban} disabled={busy}>Unban</SmallButton>
            ) : null}
          </div>

          {isModOrAdmin && !result.is_banned && (
            <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: 'var(--surface2)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 8 }}>Suspend / ban this user</div>
              <input
                value={banReason}
                onChange={e => setBanReason(e.target.value)}
                placeholder="Reason (required)"
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12.5, marginBottom: 8 }}
              />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  value={banHours}
                  onChange={e => setBanHours(e.target.value === '' ? '' : Number(e.target.value))}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12.5 }}
                >
                  <option value="">Permanent</option>
                  <option value={24}>24 hours</option>
                  <option value={72}>3 days</option>
                  <option value={168}>7 days</option>
                  <option value={720}>30 days</option>
                </select>
                <SmallButton danger onClick={handleBan} disabled={busy}>
                  <Ban size={12} /> {busy ? 'Applying…' : 'Apply'}
                </SmallButton>
              </div>
            </div>
          )}

          {isAdmin && (
            <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: 'var(--surface2)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 8 }}>Staff role</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['user', 'staff', 'moderator', 'admin'] as StaffRole[]).map(r => (
                  <SmallButton key={r} disabled={busy || result.role === r} onClick={() => handleSetRole(r)}>
                    Make {r}
                  </SmallButton>
                ))}
              </div>
            </div>
          )}

          {isModOrAdmin && (
            <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: 'var(--surface2)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 8 }}>Verified badge</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {result.is_verified ? (
                  <SmallButton disabled={busy} onClick={() => handleSetVerified(false)}>
                    <BadgeCheck size={12} /> Revoke verified
                  </SmallButton>
                ) : (
                  <SmallButton disabled={busy} onClick={() => handleSetVerified(true)}>
                    <BadgeCheck size={12} /> Grant verified
                  </SmallButton>
                )}
              </div>
            </div>
          )}

          {manualBadges.length > 0 && (
            <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: 'var(--surface2)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 8 }}>Badges (manually assigned)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {manualBadges.map(b => {
                  const owned = ownedBadgeIds.has(b.id)
                  const color = BADGE_RARITY_COLOR[b.rarity] ?? '#888899'
                  return (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: color + '1c' }}>
                        <BadgeIcon iconKey={b.icon} size={13} color={color} />
                      </div>
                      <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{b.title}</span>
                      {owned ? (
                        <SmallButton danger disabled={busy} onClick={() => handleRevokeBadge(b.id)}>Revoke</SmallButton>
                      ) : (
                        <SmallButton disabled={busy} onClick={() => handleGrantBadge(b.id)}>Grant</SmallButton>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {historyOpen && (
            <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: 'var(--surface2)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 8 }}>
                <History size={12} style={{ verticalAlign: -1, marginRight: 4 }} /> Account history
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Add a staff note…"
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12.5 }}
                />
                <SmallButton disabled={noteBusy || !noteText.trim()} onClick={handleAddNote}>
                  <NotebookPen size={12} /> Add
                </SmallButton>
              </div>

              {historyLoading ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading…</div>
              ) : history.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No history yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                  {history.map(h => <HistoryRow key={`${h.type}-${h.id}`} entry={h} />)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const HISTORY_ENTRY_COLOR: Record<UserHistoryEntry['type'], string> = {
  strike: 'var(--red)',
  log: '#5b9cff',
  note: '#4fd18a',
}

function HistoryRow({ entry }: { entry: UserHistoryEntry }) {
  const color = HISTORY_ENTRY_COLOR[entry.type]
  let label: string
  let detail: string | null = null

  if (entry.type === 'strike') {
    label = `Strike · ${STRIKE_CATEGORY_LABELS[entry.category] ?? entry.category}`
    detail = `on a ${entry.target_type}`
  } else if (entry.type === 'note') {
    label = `Note by ${entry.author ?? 'unknown'}`
    detail = entry.note
  } else {
    label = entry.action.replace(/_/g, ' ')
    detail = [entry.moderator ? `by ${entry.moderator}` : null, entry.reason].filter(Boolean).join(' — ') || null
  }

  return (
    <div style={{ borderLeft: `2px solid ${color}`, paddingLeft: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', textTransform: 'capitalize' }}>{label}</span>
        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', flexShrink: 0 }}>{new Date(entry.created_at).toLocaleString()}</span>
      </div>
      {detail && <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>{detail}</div>}
    </div>
  )
}

// ── Badges ──────────────────────────────────────────────────────────────

function BadgesTab() {
  const [badges, setBadges] = useState<BadgeDef[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  function load() {
    setLoading(true)
    getAllBadges().then(all => {
      setBadges(all)
      setLoading(false)
    })
  }

  useEffect(load, [])

  async function toggleAvailability(badge: BadgeDef) {
    setBusyId(badge.id)
    setError(null)
    const nextAvailable = !badge.is_available
    const { error } = await setBadgeAvailability(badge.id, nextAvailable)
    setBusyId(null)
    if (error) { setError(error); return }
    setBadges(prev => prev.map(b => (b.id === badge.id ? { ...b, is_available: nextAvailable } : b)))
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-dim)', fontSize: 13 }}>Loading…</div>
  if (badges.length === 0) return <EmptyState icon={Award} text="No badges have been created yet." />

  return (
    <div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 14px' }}>
        Toggling a badge unavailable stops it from being newly earned — automatically or granted by staff.
        Players who already hold it keep it.
      </p>
      {error && <div style={errorBox}>{error}</div>}
      {badges.map(b => {
        const color = BADGE_RARITY_COLOR[b.rarity] ?? '#888899'
        const busy = busyId === b.id
        return (
          <div key={b.id} style={{ ...cardStyle, padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center', background: color + '1c',
              }}>
                <BadgeIcon iconKey={b.icon} size={15} color={color} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="flex items-center gap-1.5">
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{b.title}</span>
                  <StatusPill label={b.rarity} color={color} />
                  <StatusPill label={b.grant_type} color="var(--text-muted)" />
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '3px 0 0' }}>{b.description}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                <StatusPill label={b.is_available ? 'available' : 'unavailable'} color={b.is_available ? '#4fd18a' : 'var(--red)'} />
                <SmallButton danger={b.is_available} disabled={busy} onClick={() => toggleAvailability(b)}>
                  {busy ? 'Saving…' : b.is_available ? 'Mark unavailable' : 'Mark available'}
                </SmallButton>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Roles (admin only) ────────────────────────────────────────────────

function StaffRow({ u, busy, onSetRole }: { u: AdminUserRow; busy: boolean; onSetRole: (id: string, role: StaffRole) => void }) {
  const role = (u.staff_role ?? 'user') as StaffRole
  return (
    <div style={{ ...cardStyle, padding: '10px 14px', opacity: busy ? 0.6 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Avatar src={u.avatar} name={u.display_name || u.username} size={28} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{u.display_name || u.username}</p>
          <p style={{ fontSize: 10.5, color: 'var(--text-muted)', margin: '1px 0 0' }}>@{u.username}</p>
        </div>
        <RoleBadge role={role} />
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(['user', 'staff', 'moderator', 'admin'] as StaffRole[]).map(r => (
          <SmallButton key={r} disabled={busy || role === r} onClick={() => onSetRole(u.id, r)}>
            Make {r}
          </SmallButton>
        ))}
      </div>
    </div>
  )
}

function RolesTab() {
  const [staff, setStaff] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [suggestions, setSuggestions] = useState<StaffUserSearchRow[]>([])
  const [searching, setSearching] = useState(false)
  const [promoteBusyId, setPromoteBusyId] = useState<string | null>(null)

  function loadStaff() {
    setLoading(true)
    fetchAdminUserList(1, 100, '', 'staff').then(({ data, error }) => {
      if (error) setError(error)
      setStaff(data?.rows ?? [])
      setLoading(false)
    })
  }

  useEffect(loadStaff, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    let active = true
    if (!debouncedQuery.trim()) { setSuggestions([]); setSearching(false); return }
    setSearching(true)
    searchStaffUsers(debouncedQuery).then(({ data }) => {
      if (!active) return
      // Anyone already in the staff list below doesn't need to show up
      // again in the "promote someone new" search results.
      setSuggestions(data.filter(u => !staff.some(s => s.id === u.user_id)))
      setSearching(false)
    })
    return () => { active = false }
  }, [debouncedQuery, staff])

  async function changeRole(userId: string, role: StaffRole, isPromotion: boolean) {
    if (isPromotion) setPromoteBusyId(userId); else setBusyId(userId)
    setError('')
    const { error } = await setUserRole(userId, role)
    setPromoteBusyId(null)
    setBusyId(null)
    if (error) { setError(error); return }
    if (isPromotion) setQuery('')
    loadStaff()
  }

  return (
    <div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 14px' }}>
        Admin-only. Changing someone's role takes effect immediately — they don't need to sign out.
      </p>
      {error && <div style={errorBox}>{error}</div>}

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Promote a user
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by username or display name…"
            style={{
              width: '100%', padding: '9px 12px 9px 32px', borderRadius: 10, border: '1px solid var(--border)',
              background: 'var(--surface2)', color: 'var(--text)', fontSize: 12.5,
            }}
          />
        </div>
        {query.trim() && (
          <div style={{ marginTop: 8 }}>
            {searching ? (
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', padding: '8px 4px' }}>Searching…</p>
            ) : suggestions.length === 0 ? (
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', padding: '8px 4px' }}>No matches.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {suggestions.map(u => (
                  <div key={u.user_id} style={{ ...cardStyle, padding: '10px 14px', opacity: promoteBusyId === u.user_id ? 0.6 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <Avatar src={u.avatar} name={u.display_name || u.username} size={26} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{u.display_name || u.username}</p>
                        <p style={{ fontSize: 10.5, color: 'var(--text-muted)', margin: '1px 0 0' }}>@{u.username}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(['staff', 'moderator', 'admin'] as StaffRole[]).map(r => (
                        <SmallButton key={r} disabled={promoteBusyId === u.user_id} onClick={() => changeRole(u.user_id, r, true)}>
                          Make {r}
                        </SmallButton>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
        Current staff ({staff.length})
      </div>
      {loading ? (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Loading…</p>
      ) : staff.length === 0 ? (
        <EmptyState icon={UserCog} text="No staff members yet." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {staff.map(u => (
            <StaffRow key={u.id} u={u} busy={busyId === u.id} onSetRole={(id, r) => changeRole(id, r, false)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Word filter (admin only) ──────────────────────────────────────────

const BANNED_TERM_CATEGORIES = Object.keys(BANNED_TERM_CATEGORY_LABELS) as BannedTermCategory[]

function FiltersTab() {
  const [terms, setTerms] = useState<BannedTerm[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [category, setCategory] = useState<BannedTermCategory>('profanity')
  const [pattern, setPattern] = useState('')
  const [adding, setAdding] = useState(false)

  function load() {
    setLoading(true)
    fetchBannedTerms().then(({ data, error }) => {
      setTerms(data)
      setError(error)
      setLoading(false)
    })
  }

  useEffect(load, [])

  async function handleAdd() {
    if (!pattern.trim()) { setError('Enter a word or phrase.'); return }
    setAdding(true)
    const { data, error } = await addBannedTerm(category, pattern.trim())
    setAdding(false)
    if (error) { setError(error); return }
    setError(null)
    setPattern('')
    if (data) setTerms(prev => [...prev, data].sort((a, b) => a.category.localeCompare(b.category) || a.pattern.localeCompare(b.pattern)))
  }

  async function handleToggleActive(term: BannedTerm) {
    setBusyId(term.id)
    const { data, error } = await updateBannedTerm(term.id, { active: !term.active })
    setBusyId(null)
    if (error) { setError(error); return }
    if (data) setTerms(prev => prev.map(t => (t.id === term.id ? data : t)))
  }

  async function handleDelete(term: BannedTerm) {
    setBusyId(term.id)
    const { error } = await deleteBannedTerm(term.id)
    setBusyId(null)
    if (error) { setError(error); return }
    setTerms(prev => prev.filter(t => t.id !== term.id))
  }

  const byCategory = BANNED_TERM_CATEGORIES.map(cat => ({ cat, rows: terms.filter(t => t.category === cat) }))

  return (
    <div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 14px' }}>
        Admin-only. Words and phrases below feed the automated content filter directly — changes apply immediately
        to new messages, posts, and comments, no deploy needed. Turning a term off keeps it here but stops it from matching.
      </p>
      {error && <div style={errorBox}>{error}</div>}

      <div style={{ ...cardStyle, padding: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 8 }}>Add a term</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={category}
            onChange={e => setCategory(e.target.value as BannedTermCategory)}
            style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12.5 }}
          >
            {BANNED_TERM_CATEGORIES.map(c => <option key={c} value={c}>{BANNED_TERM_CATEGORY_LABELS[c]}</option>)}
          </select>
          <input
            value={pattern}
            onChange={e => setPattern(e.target.value)}
            placeholder="Word or phrase (regex ok, e.g. kill\s*yourself)"
            style={{ flex: 1, minWidth: 180, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12.5 }}
          />
          <SmallButton onClick={handleAdd} disabled={adding}>
            <Plus size={12} /> Add
          </SmallButton>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-dim)', fontSize: 13 }}>Loading…</div>
      ) : (
        byCategory.map(({ cat, rows }) => (
          <div key={cat} style={{ marginTop: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              {BANNED_TERM_CATEGORY_LABELS[cat]} ({rows.length})
            </div>
            {rows.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 4px 0' }}>No terms in this category.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rows.map(t => (
                  <div key={t.id} style={{ ...cardStyle, margin: 0, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8, opacity: busyId === t.id ? 0.6 : 1 }}>
                    <code style={{ flex: 1, fontSize: 12, color: t.active ? 'var(--text)' : 'var(--text-muted)', wordBreak: 'break-word', textDecoration: t.active ? 'none' : 'line-through' }}>
                      {t.pattern}
                    </code>
                    <SmallButton disabled={busyId === t.id} onClick={() => handleToggleActive(t)}>
                      {t.active ? 'Disable' : 'Enable'}
                    </SmallButton>
                    <SmallButton danger disabled={busyId === t.id} onClick={() => handleDelete(t)}>
                      <X size={12} />
                    </SmallButton>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

// ── Strike threshold (admin only) ──────────────────────────────────────

function SettingsTab() {
  const [threshold, setThreshold] = useState<number | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchModerationSettings().then(({ data, error }) => {
      setError(error)
      if (data) { setThreshold(data.strike_alert_threshold); setInput(String(data.strike_alert_threshold)) }
      setLoading(false)
    })
  }, [])

  async function handleSave() {
    const n = Number(input)
    if (!Number.isInteger(n) || n < 1 || n > 100) { setError('Enter a whole number between 1 and 100.'); return }
    setSaving(true)
    const { data, error } = await updateStrikeThreshold(n)
    setSaving(false)
    if (error) { setError(error); return }
    setError(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    if (data) setThreshold(data.strike_alert_threshold)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-dim)', fontSize: 13 }}>Loading…</div>

  return (
    <div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 14px' }}>
        Admin-only. This is how many strikes (auto-removed hate speech, threats, profanity, etc.) an account can
        accumulate before it pings the Alerts tab for a ban/no-ban decision.
      </p>
      {error && <div style={errorBox}>{error}</div>}

      <div style={{ ...cardStyle }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 8 }}>Strike alert threshold</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="number"
            min={1}
            max={100}
            value={input}
            onChange={e => setInput(e.target.value)}
            style={{ width: 90, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13 }}
          />
          <SmallButton onClick={handleSave} disabled={saving || Number(input) === threshold}>
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
          </SmallButton>
        </div>
        {threshold !== null && <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '10px 0 0' }}>Currently {threshold} strikes.</p>}
      </div>
    </div>
  )
}

// ── Audit log ──────────────────────────────────────────────────────────

function LogTab() {
  const [entries, setEntries] = useState<ModerationLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchModerationLog().then(({ data }) => { setEntries(data); setLoading(false) })
  }, [])

  if (loading) return <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-dim)', fontSize: 13 }}>Loading…</div>
  if (entries.length === 0) return <EmptyState icon={ScrollText} text="No moderation actions yet." />

  return (
    <div>
      {entries.map(e => (
        <div key={e.id} style={{ ...cardStyle, padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
              {e.action.replace('_', ' ')} <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>· {e.target_type}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(e.created_at).toLocaleString()}</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
            by {e.moderator?.username ?? 'unknown'}{e.reason ? ` — ${e.reason}` : ''}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Small shared bits ─────────────────────────────────────────────────

function RoleBadge({ role }: { role: StaffRole }) {
  if (role === 'user') return null
  const color = role === 'admin' ? 'var(--accent)' : role === 'staff' ? '#4fd18a' : '#5b9cff'
  return <StatusPill label={role} color={color} />
}

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

function SmallButton({ children, onClick, danger, disabled, type = 'button' }: {
  children: React.ReactNode
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
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

function EmptyState({ icon: Icon, text }: { icon: typeof Flag; text: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '48px 20px', textAlign: 'center' }}>
      <Icon size={28} color="var(--text-muted)" />
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
