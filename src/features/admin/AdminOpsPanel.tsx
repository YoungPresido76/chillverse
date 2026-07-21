// src/features/admin/AdminOpsPanel.tsx
//
// The "Ops console" wing of the Admin Dashboard, restyled to match how
// Settings.tsx is put together: a single scrollable page, grouped into
// SectionTitle + .settings-card blocks of compact Row/ToggleRow entries.
// Anything that needs a form (editing the maintenance message, composing
// a broadcast, flipping a whole category of flags) opens in a popover
// modal — the same pattern Settings uses for Log out / Microphone —
// instead of being sprawled inline as its own big card. Simple instant
// actions (a toggle, a CSV download) just happen right on the row, no
// modal needed, same as Settings' "Game sound" toggle or "Support" link.
import { useEffect, useState } from 'react'
import {
  Power, Megaphone, Download, Activity, AlertTriangle,
  Gamepad2, Map as MapIcon, Settings2, Clock, Send, X, MessageSquare,
} from 'lucide-react'
import { ripple } from '../../shared/lib/ripple'
import { Row, ToggleRow, SectionTitle } from '../settings/settingsShared'
import {
  fetchAppConfig, setMaintenanceMode, broadcastNotification,
  fetchFeatureFlags, setFeatureFlag, exportUsersCsv, exportTransactionsCsv,
  fetchSystemHealth, type FeatureFlag, type SystemHealth,
} from './adminOps'

// ── Shared modal shell (mirrors Settings.tsx's Log out / Microphone popovers) ──

function Modal({ title, onClose, children, width = 380 }: { title: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'var(--overlay-scrim)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <style>{`@keyframes popIn { from { opacity:0; transform: scale(0.92) } to { opacity:1; transform: scale(1) } }`}</style>
      <div style={{ background: 'var(--popover)', borderRadius: 20, padding: 22, width: '100%', maxWidth: width, maxHeight: '82vh', overflowY: 'auto', border: '1px solid var(--border)', boxShadow: 'var(--elev-popover)', animation: 'popIn 0.22s var(--ease-spring) both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
          <button onClick={onClose} aria-label="Close" style={{ width: 28, height: 28, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const fieldLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', margin: '0 0 6px' }
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)',
  background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, outline: 'none',
}

// ── Maintenance ─────────────────────────────────────────────────────

function MaintenanceMessageModal({ message, scheduledFor, onClose, onSaved }: {
  message: string
  scheduledFor: string
  onClose: () => void
  onSaved: (message: string, scheduledFor: string) => void
}) {
  const [text, setText] = useState(message)
  const [when, setWhen] = useState(scheduledFor)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setSaving(true)
    setError('')
    // Re-sends the current enabled state implicitly — this modal only
    // edits copy/schedule, the ToggleRow on the main page owns on/off.
    const { data } = await fetchAppConfig()
    const { error } = await setMaintenanceMode(data?.maintenance_enabled ?? false, text, when ? new Date(when).toISOString() : null)
    setSaving(false)
    if (error) { setError(error); return }
    onSaved(text, when)
    onClose()
  }

  return (
    <Modal title="Maintenance message" onClose={onClose}>
      <p style={fieldLabel}>Message shown to players</p>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical', marginBottom: 14 }} />
      <p style={{ ...fieldLabel, display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={10} /> Scheduled for (optional)</p>
      <input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }} />
      {error && <p style={{ fontSize: 11.5, color: 'var(--red)', marginBottom: 12 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} className="btn-secondary" style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>Cancel</button>
        <button onClick={save} disabled={saving} className="btn-primary" style={{ flex: 1, padding: '10px 0', fontSize: 13, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Modal>
  )
}

function useMaintenance() {
  const [enabled, setEnabled] = useState(false)
  const [message, setMessage] = useState('')
  const [scheduledFor, setScheduledFor] = useState('')
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    fetchAppConfig().then(({ data }) => {
      if (data) {
        setEnabled(data.maintenance_enabled)
        setMessage(data.maintenance_message)
        setScheduledFor(data.maintenance_scheduled_for ? data.maintenance_scheduled_for.slice(0, 16) : '')
      }
      setLoading(false)
    })
  }, [])

  async function toggle() {
    setToggling(true)
    const next = !enabled
    const { error } = await setMaintenanceMode(next, message, scheduledFor ? new Date(scheduledFor).toISOString() : null)
    setToggling(false)
    if (!error) setEnabled(next)
    return error
  }

  return { enabled, message, scheduledFor, loading, toggling, toggle, setMessage, setScheduledFor }
}

// ── Broadcast ─────────────────────────────────────────────────────────

function BroadcastModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  async function send() {
    setSending(true)
    setError('')
    const { count, error } = await broadcastNotification(title.trim(), body.trim())
    setSending(false)
    setConfirming(false)
    if (error) { setError(error); return }
    setResult(`Sent to ${count.toLocaleString()} ${count === 1 ? 'user' : 'users'}.`)
    setTitle('')
    setBody('')
  }

  const canSend = title.trim().length > 0 && body.trim().length > 0

  return (
    <Modal title="Broadcast notification" onClose={onClose}>
      <p style={fieldLabel}>Title</p>
      <input value={title} onChange={e => setTitle(e.target.value)} maxLength={80} placeholder="e.g. Scheduled maintenance tonight" style={{ ...inputStyle, marginBottom: 14 }} />
      <p style={fieldLabel}>Message</p>
      <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} maxLength={400} placeholder="What should everyone know?" style={{ ...inputStyle, resize: 'vertical', marginBottom: 16 }} />

      {result && <p style={{ fontSize: 12, color: '#4fd18a', fontWeight: 700, marginBottom: 12 }}>{result}</p>}
      {error && <p style={{ fontSize: 11.5, color: 'var(--red)', marginBottom: 12 }}>{error}</p>}

      {!confirming ? (
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} className="btn-secondary" style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>Close</button>
          <button
            onClick={() => canSend && setConfirming(true)}
            disabled={!canSend}
            className="btn-primary"
            style={{ flex: 1, padding: '10px 0', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: canSend ? 1 : 0.5 }}
          >
            <Send size={12} /> Send to all
          </button>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 12, fontWeight: 600 }}>Send this to every user — sure?</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setConfirming(false)} disabled={sending} className="btn-secondary" style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>Cancel</button>
            <button onClick={send} disabled={sending} className="btn-primary" style={{ flex: 1, padding: '10px 0', fontSize: 13, background: 'var(--red)', opacity: sending ? 0.6 : 1 }}>
              {sending ? 'Sending…' : 'Confirm send'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── Feature flags ─────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; icon: typeof Gamepad2; sub: string }> = {
  game: { label: 'Games', icon: Gamepad2, sub: 'Disabled games stop being newly playable for everyone.' },
  map: { label: 'Exploration maps', icon: MapIcon, sub: 'Disabled maps stop being newly enterable for everyone.' },
  system: { label: 'Systems', icon: Settings2, sub: 'Broad kill-switches for whole app areas.' },
}

function FlagCategoryModal({ category, flags, onClose, onChange }: {
  category: string
  flags: FeatureFlag[]
  onClose: () => void
  onChange: (key: string, enabled: boolean) => void
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState('')
  const meta = CATEGORY_META[category] ?? { label: category, icon: Settings2, sub: '' }

  async function toggle(f: FeatureFlag) {
    setBusyKey(f.key)
    setError('')
    const next = !f.enabled
    const { error } = await setFeatureFlag(f.key, next)
    setBusyKey(null)
    if (error) { setError(error); return }
    onChange(f.key, next)
  }

  return (
    <Modal title={meta.label} onClose={onClose} width={420}>
      {meta.sub && <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '0 0 14px' }}>{meta.sub}</p>}
      {error && <p style={{ fontSize: 11.5, color: 'var(--red)', marginBottom: 10 }}>{error}</p>}
      <div className="settings-card" style={{ marginBottom: 0 }}>
        {flags.map(f => (
          <ToggleRow
            key={f.key}
            label={f.label}
            on={f.enabled}
            onToggle={() => toggle(f)}
            disabled={busyKey === f.key}
          />
        ))}
      </div>
    </Modal>
  )
}

// ── System health ────────────────────────────────────────────────────

function HealthStat({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
      <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 3px' }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 800, color: warn ? 'var(--red)' : 'var(--text)', margin: 0 }}>{value}</p>
    </div>
  )
}

function SystemHealthModal({ onClose }: { onClose: () => void }) {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSystemHealth().then(({ data, error }) => {
      if (error) setError(error)
      setHealth(data)
      setLoading(false)
    })
  }, [])

  return (
    <Modal title="System health" onClose={onClose} width={440}>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 14px' }}>
        Real signals only — client error volume and report/ticket backlog. No platform-level logs are available to this client.
      </p>
      {loading ? (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Loading…</p>
      ) : error ? (
        <p style={{ fontSize: 11.5, color: 'var(--red)' }}>{error}</p>
      ) : health && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 14 }}>
            <HealthStat label="Client errors (24h)" value={health.client_errors.errors_24h} warn={health.client_errors.errors_24h > 0} />
            <HealthStat label="Client errors (7d)" value={health.client_errors.errors_7d} />
            <HealthStat label="Open reports" value={health.moderation_backlog.open_reports} warn={health.moderation_backlog.open_reports > 5} />
            <HealthStat
              label="Oldest open report"
              value={health.moderation_backlog.oldest_open_report_age_hours != null ? `${health.moderation_backlog.oldest_open_report_age_hours}h` : '—'}
            />
            <HealthStat label="Open tickets" value={health.support_backlog.open_tickets} />
            <HealthStat label="Disabled flags" value={health.flags.disabled_count} warn={health.flags.disabled_count > 0} />
          </div>

          {health.flags.maintenance_enabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,79,79,0.1)', border: '1px solid rgba(255,79,79,0.3)', marginBottom: 14 }}>
              <AlertTriangle size={12} style={{ color: 'var(--red)', flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--red)' }}>Maintenance mode is currently ON.</span>
            </div>
          )}

          {health.client_errors.top_messages_7d.length > 0 && (
            <>
              <p style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-dim)', margin: '0 0 6px' }}>Most common errors (7d)</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {health.client_errors.top_messages_7d.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, padding: '6px 8px', borderRadius: 8, background: 'var(--surface2)' }}>
                    <span style={{ color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.message}</span>
                    <span style={{ color: 'var(--text-muted)', flexShrink: 0, fontWeight: 700 }}>{m.occurrences}×</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </Modal>
  )
}

// ── Root ────────────────────────────────────────────────────────────────

type ModalKind = 'maintenance-message' | 'broadcast' | 'health' | { category: string } | null

export default function AdminOpsPanel() {
  const maint = useMaintenance()
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [flagsLoading, setFlagsLoading] = useState(true)
  const [modal, setModal] = useState<ModalKind>(null)
  const [exportBusy, setExportBusy] = useState<'users' | 'transactions' | null>(null)
  const [pageError, setPageError] = useState('')

  useEffect(() => {
    fetchFeatureFlags().then(({ data }) => { setFlags(data); setFlagsLoading(false) })
  }, [])

  function updateFlag(key: string, enabled: boolean) {
    setFlags(prev => prev.map(f => (f.key === key ? { ...f, enabled } : f)))
  }

  async function runExport(kind: 'users' | 'transactions') {
    setExportBusy(kind)
    setPageError('')
    const { error } = kind === 'users' ? await exportUsersCsv() : await exportTransactionsCsv()
    setExportBusy(null)
    if (error) setPageError(error)
  }

  const categories = ['game', 'map', 'system']
  const flagsByCategory = (cat: string) => flags.filter(f => f.category === cat)
  const flagSummary = (cat: string) => {
    const cf = flagsByCategory(cat)
    const enabled = cf.filter(f => f.enabled).length
    return `${enabled}/${cf.length} on`
  }

  const maintenanceSub = maint.loading
    ? undefined
    : maint.enabled
      ? 'Blocking the app for everyone except staff'
      : 'App is live for everyone'

  return (
    <div>
      <style>{`
        .settings-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: var(--elev-raise-sm);
          margin-bottom: 20px;
        }
        .settings-card > * {
          border-radius: 0 !important;
          box-shadow: none !important;
          margin: 0 !important;
          border: none !important;
          border-bottom: 1px solid var(--border) !important;
        }
        .settings-card > *:last-child { border-bottom: none !important; }
      `}</style>

      <SectionTitle>Availability</SectionTitle>
      <div className="settings-card">
        <ToggleRow
          icon={<Power size={15} />} iconBg="rgba(255,79,79,0.12)" iconColor="var(--red)"
          label="Maintenance mode" sub={maintenanceSub}
          on={maint.enabled}
          onToggle={async () => { const err = await maint.toggle(); if (err) setPageError(err) }}
          disabled={maint.loading || maint.toggling}
        />
        <Row
          icon={<MessageSquare size={15} />} iconBg="rgba(155,109,255,0.12)" iconColor="var(--purple)"
          label="Maintenance message" value={maint.loading ? undefined : (maint.message.length > 24 ? maint.message.slice(0, 24) + '…' : maint.message)}
          onClick={(e) => { ripple(e); setModal('maintenance-message') }}
        />
      </div>

      <SectionTitle>Announcements</SectionTitle>
      <div className="settings-card">
        <Row
          icon={<Megaphone size={15} />} iconBg="color-mix(in srgb, var(--accent) 12%, transparent)" iconColor="var(--accent)"
          label="Broadcast notification" sub="Notify every user in-app"
          onClick={(e) => { ripple(e); setModal('broadcast') }}
        />
      </div>

      <SectionTitle>Feature flags</SectionTitle>
      <div className="settings-card">
        {categories.map(cat => {
          const meta = CATEGORY_META[cat]
          const Icon = meta.icon
          return (
            <Row
              key={cat}
              icon={<Icon size={15} />} iconBg="rgba(79,142,247,0.12)" iconColor="var(--blue)"
              label={meta.label} value={flagsLoading ? undefined : flagSummary(cat)}
              onClick={(e) => { ripple(e); setModal({ category: cat }) }}
            />
          )
        })}
      </div>

      <SectionTitle>Data export</SectionTitle>
      <div className="settings-card">
        <Row
          icon={<Download size={15} />} iconBg="rgba(62,207,142,0.12)" iconColor="var(--green)"
          label={exportBusy === 'users' ? 'Exporting…' : 'Export users'} value="CSV"
          onClick={(e) => { if (!exportBusy) { ripple(e); runExport('users') } }}
        />
        <Row
          icon={<Download size={15} />} iconBg="rgba(62,207,142,0.12)" iconColor="var(--green)"
          label={exportBusy === 'transactions' ? 'Exporting…' : 'Export diamond transactions'} value="CSV"
          onClick={(e) => { if (!exportBusy) { ripple(e); runExport('transactions') } }}
        />
      </div>
      {pageError && <p style={{ fontSize: 11.5, color: 'var(--red)', margin: '-6px 0 16px 4px' }}>{pageError}</p>}

      <SectionTitle>System health</SectionTitle>
      <div className="settings-card">
        <Row
          icon={<Activity size={15} />} iconBg="rgba(245,197,66,0.12)" iconColor="var(--gold)"
          label="View system health" sub="Client errors, report & ticket backlog"
          onClick={(e) => { ripple(e); setModal('health') }}
        />
      </div>

      {modal === 'maintenance-message' && (
        <MaintenanceMessageModal
          message={maint.message}
          scheduledFor={maint.scheduledFor}
          onClose={() => setModal(null)}
          onSaved={(msg, sched) => { maint.setMessage(msg); maint.setScheduledFor(sched) }}
        />
      )}
      {modal === 'broadcast' && <BroadcastModal onClose={() => setModal(null)} />}
      {modal === 'health' && <SystemHealthModal onClose={() => setModal(null)} />}
      {modal && typeof modal === 'object' && (
        <FlagCategoryModal
          category={modal.category}
          flags={flagsByCategory(modal.category)}
          onClose={() => setModal(null)}
          onChange={updateFlag}
        />
      )}
    </div>
  )
}
