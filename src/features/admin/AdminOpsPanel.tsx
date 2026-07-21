// src/features/admin/AdminOpsPanel.tsx
// The "Ops Console" wing of the Admin Dashboard — everything from
// migration 0056 that isn't a user drill-down: maintenance mode,
// broadcast notifications, feature flag kill-switches, CSV export, and
// a system health summary. Pulled into its own file so AdminDashboard.tsx
// doesn't have to grow by another few hundred lines inline.
import { useEffect, useState } from 'react'
import {
  Power, Megaphone, ToggleLeft, Download, Activity, AlertTriangle,
  Gamepad2, Map as MapIcon, Settings2, Clock, Send, Loader2,
} from 'lucide-react'
import {
  fetchAppConfig, setMaintenanceMode, broadcastNotification,
  fetchFeatureFlags, setFeatureFlag, exportUsersCsv, exportTransactionsCsv,
  fetchSystemHealth, type FeatureFlag, type SystemHealth,
} from './adminOps'

function Card({ children }: { children: React.ReactNode }) {
  return <div className="neu-card" style={{ padding: 16, marginBottom: 14 }}>{children}</div>
}

function CardTitle({ icon: Icon, title, sub }: { icon: typeof Power; title: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--accent)22', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={13} />
      </div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{title}</p>
        {sub && <p style={{ fontSize: 10.5, color: 'var(--text-muted)', margin: '1px 0 0' }}>{sub}</p>}
      </div>
    </div>
  )
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      style={{
        width: 38, height: 22, borderRadius: 999, flexShrink: 0, position: 'relative', cursor: disabled ? 'default' : 'pointer',
        background: checked ? 'var(--accent)' : 'var(--surface2)', border: '1px solid var(--border)',
        opacity: disabled ? 0.5 : 1, transition: 'background 0.15s',
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: checked ? 18 : 2, width: 16, height: 16, borderRadius: '50%',
        background: '#fff', transition: 'left 0.15s',
      }} />
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 11px', borderRadius: 9, border: '1px solid var(--border)',
  background: 'var(--surface2)', color: 'var(--text)', fontSize: 12.5, outline: 'none',
}

// ── Maintenance mode ─────────────────────────────────────────────────

function MaintenanceCard() {
  const [enabled, setEnabled] = useState(false)
  const [message, setMessage] = useState('')
  const [scheduledFor, setScheduledFor] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

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

  async function save(nextEnabled: boolean) {
    setSaving(true)
    setError('')
    setSaved(false)
    const { error } = await setMaintenanceMode(nextEnabled, message, scheduledFor ? new Date(scheduledFor).toISOString() : null)
    setSaving(false)
    if (error) { setError(error); return }
    setEnabled(nextEnabled)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <CardTitle icon={Power} title="Maintenance mode" sub="Blocks the app for everyone except staff." />
        {!loading && <Toggle checked={enabled} onChange={() => save(!enabled)} disabled={saving} />}
      </div>
      {!loading && (
        <>
          <p style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-dim)', margin: '2px 0 5px' }}>Message shown to players</p>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', marginBottom: 10 }}
          />
          <p style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-dim)', margin: '0 0 5px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={10} /> Scheduled for (optional)
          </p>
          <input
            type="datetime-local"
            value={scheduledFor}
            onChange={e => setScheduledFor(e.target.value)}
            style={{ ...inputStyle, marginBottom: 10 }}
          />
          <button
            type="button"
            onClick={() => save(enabled)}
            disabled={saving}
            style={{
              padding: '8px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface2)',
              color: 'var(--text-dim)', fontSize: 11.5, fontWeight: 700, cursor: saving ? 'default' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save message & schedule'}
          </button>
          {error && <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 8 }}>{error}</p>}
        </>
      )}
    </Card>
  )
}

// ── Broadcast composer ───────────────────────────────────────────────

function BroadcastCard() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string>('')
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
    setTimeout(() => setResult(''), 4000)
  }

  const canSend = title.trim().length > 0 && body.trim().length > 0

  return (
    <Card>
      <CardTitle icon={Megaphone} title="Broadcast notification" sub="Posts an in-app notification to every user." />
      <p style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-dim)', margin: '0 0 5px' }}>Title</p>
      <input value={title} onChange={e => setTitle(e.target.value)} maxLength={80} placeholder="e.g. Scheduled maintenance tonight" style={{ ...inputStyle, marginBottom: 10 }} />
      <p style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-dim)', margin: '0 0 5px' }}>Message</p>
      <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} maxLength={400} placeholder="What should everyone know?" style={{ ...inputStyle, resize: 'vertical', marginBottom: 10 }} />

      {!confirming ? (
        <button
          type="button"
          onClick={() => canSend && setConfirming(true)}
          disabled={!canSend}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none',
            background: canSend ? 'var(--accent)' : 'var(--surface2)', color: canSend ? '#fff' : 'var(--text-muted)',
            fontSize: 12, fontWeight: 800, cursor: canSend ? 'pointer' : 'default',
          }}
        >
          <Send size={12} /> Send to all users
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-dim)', fontWeight: 700 }}>Send to every user — sure?</span>
          <button
            type="button"
            onClick={send}
            disabled={sending}
            style={{ padding: '7px 14px', borderRadius: 9, border: 'none', background: 'var(--red)', color: '#fff', fontSize: 11.5, fontWeight: 800, cursor: sending ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            {sending && <Loader2 size={11} className="animate-spin" />} Confirm send
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={sending}
            style={{ padding: '7px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      )}

      {result && <p style={{ fontSize: 11.5, color: '#4fd18a', marginTop: 10, fontWeight: 700 }}>{result}</p>}
      {error && <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 10 }}>{error}</p>}
    </Card>
  )
}

// ── Feature flags ─────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; icon: typeof Gamepad2 }> = {
  game: { label: 'Games', icon: Gamepad2 },
  map: { label: 'Exploration maps', icon: MapIcon },
  system: { label: 'Systems', icon: Settings2 },
}

function FeatureFlagsCard() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchFeatureFlags().then(({ data }) => { setFlags(data); setLoading(false) })
  }, [])

  async function toggle(flag: FeatureFlag) {
    setBusyKey(flag.key)
    setError('')
    const next = !flag.enabled
    const { error } = await setFeatureFlag(flag.key, next)
    setBusyKey(null)
    if (error) { setError(error); return }
    setFlags(prev => prev.map(f => (f.key === flag.key ? { ...f, enabled: next } : f)))
  }

  const byCategory = flags.reduce<Record<string, FeatureFlag[]>>((acc, f) => {
    (acc[f.category] ??= []).push(f)
    return acc
  }, {})

  return (
    <Card>
      <CardTitle icon={ToggleLeft} title="Feature flags" sub="Games and maps disabled here stop being newly playable/enterable for everyone." />
      {loading ? (
        <p style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center', padding: 10 }}>Loading…</p>
      ) : (
        Object.entries(byCategory).map(([category, catFlags]) => {
          const meta = CATEGORY_META[category] ?? { label: category, icon: Settings2 }
          const Icon = meta.icon
          return (
            <div key={category} style={{ marginBottom: 14 }}>
              <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>
                <Icon size={11} /> {meta.label}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
                {catFlags.map(f => (
                  <div key={f.key} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    padding: '8px 10px', borderRadius: 9, background: 'var(--surface2)', border: '1px solid var(--border)',
                    opacity: busyKey === f.key ? 0.6 : 1,
                  }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: f.enabled ? 'var(--text)' : 'var(--text-muted)' }}>{f.label}</span>
                    <Toggle checked={f.enabled} onChange={() => toggle(f)} disabled={busyKey === f.key} />
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}
      {error && <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{error}</p>}
    </Card>
  )
}

// ── CSV export ────────────────────────────────────────────────────────

function ExportCard() {
  const [busy, setBusy] = useState<'users' | 'transactions' | null>(null)
  const [error, setError] = useState('')

  async function run(kind: 'users' | 'transactions') {
    setBusy(kind)
    setError('')
    const { error } = kind === 'users' ? await exportUsersCsv() : await exportTransactionsCsv()
    setBusy(null)
    if (error) setError(error)
  }

  return (
    <Card>
      <CardTitle icon={Download} title="Export CSV" sub="Downloads directly to your device." />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => run('users')}
          disabled={busy !== null}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: busy ? 'default' : 'pointer' }}
        >
          <Download size={12} /> {busy === 'users' ? 'Exporting…' : 'Users (.csv)'}
        </button>
        <button
          type="button"
          onClick={() => run('transactions')}
          disabled={busy !== null}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: busy ? 'default' : 'pointer' }}
        >
          <Download size={12} /> {busy === 'transactions' ? 'Exporting…' : 'Diamond transactions (.csv)'}
        </button>
      </div>
      {error && <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 10 }}>{error}</p>}
    </Card>
  )
}

// ── System health ────────────────────────────────────────────────────

function HealthStat({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 9, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
      <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 3px' }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 800, color: warn ? 'var(--red)' : 'var(--text)', margin: 0 }}>{value}</p>
    </div>
  )
}

function SystemHealthCard() {
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
    <Card>
      <CardTitle icon={Activity} title="System health" sub="Real signals only — client error volume and report/ticket backlog. No platform-level logs are available to this client." />
      {loading ? (
        <p style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center', padding: 10 }}>Loading…</p>
      ) : error ? (
        <p style={{ fontSize: 11.5, color: 'var(--red)' }}>{error}</p>
      ) : health && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 12 }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: 9, background: 'rgba(255,79,79,0.1)', border: '1px solid rgba(255,79,79,0.3)', marginBottom: 12 }}>
              <AlertTriangle size={12} style={{ color: 'var(--red)', flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--red)' }}>Maintenance mode is currently ON.</span>
            </div>
          )}

          {health.client_errors.top_messages_7d.length > 0 && (
            <>
              <p style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-dim)', margin: '0 0 6px' }}>Most common errors (7d)</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {health.client_errors.top_messages_7d.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, padding: '6px 8px', borderRadius: 7, background: 'var(--surface2)' }}>
                    <span style={{ color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.message}</span>
                    <span style={{ color: 'var(--text-muted)', flexShrink: 0, fontWeight: 700 }}>{m.occurrences}×</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </Card>
  )
}

export default function AdminOpsPanel() {
  return (
    <div>
      <MaintenanceCard />
      <BroadcastCard />
      <FeatureFlagsCard />
      <ExportCard />
      <SystemHealthCard />
    </div>
  )
}
