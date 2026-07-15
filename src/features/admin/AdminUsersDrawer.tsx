// src/features/admin/AdminUsersDrawer.tsx
import { useEffect, useState } from 'react'
import { Search, ChevronLeft, ChevronRight, AlertTriangle, Crown, ShieldCheck, ShieldBan, Gem } from 'lucide-react'
import AdminDrawer from './AdminDrawer'
import AdminUserDetailDrawer from './AdminUserDetailDrawer'
import Avatar from '../../shared/components/Avatar'
import { fetchAdminUserList, type AdminUserRow } from './adminStats'

const PAGE_SIZE = 20

interface AdminUsersDrawerProps {
  open: boolean
  onClose: () => void
}

function RolePill({ role }: { role: AdminUserRow['staff_role'] }) {
  if (!role || role === 'user') return null
  const color = role === 'admin' ? 'var(--lred)' : role === 'moderator' ? 'var(--cyan)' : 'var(--violet-soft)'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 800,
      textTransform: 'uppercase', letterSpacing: '0.04em', color, background: `${color}1c`,
      border: `1px solid ${color}40`, borderRadius: 6, padding: '2px 6px',
    }}>
      <ShieldCheck size={9} /> {role}
    </span>
  )
}

export default function AdminUsersDrawer({ open, onClose }: AdminUsersDrawerProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<AdminUserRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  // Reset to page 1 whenever the drawer is (re)opened or the search changes.
  useEffect(() => { if (open) setPage(1) }, [open, debouncedSearch])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    setError('')
    fetchAdminUserList(page, PAGE_SIZE, debouncedSearch).then(({ data, error }) => {
      if (!active) return
      if (error) setError(error)
      setRows(data?.rows ?? [])
      setTotal(data?.total ?? 0)
      setLoading(false)
    })
    return () => { active = false }
  }, [open, page, debouncedSearch])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <>
      <AdminDrawer open={open} onClose={onClose} title="Users" subtitle={`${total.toLocaleString()} total`}>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ltext-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by username, name, or email…"
            style={{
              width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--lborder)', borderRadius: 12,
              padding: '11px 14px 11px 38px', fontSize: 13, color: 'var(--ltext)', outline: 'none',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--lborder-bright)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--lborder)' }}
          />
        </div>

        {error && (
          <div style={{
            fontSize: 12, color: 'var(--lred)', marginBottom: 12, padding: '9px 12px', borderRadius: 10,
            background: 'rgba(255,79,79,0.08)', border: '1px solid rgba(255,79,79,0.25)',
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <p style={{ fontSize: 12, color: 'var(--ltext-muted)', textAlign: 'center', padding: '32px 0' }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--ltext-muted)', textAlign: 'center', padding: '32px 0' }}>No users match that search.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rows.map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelectedUserId(u.id)}
                className="glass-chip"
                style={{
                  display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left',
                  borderRadius: 12, padding: '10px 12px', cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--lborder-bright)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)' }}
              >
                <Avatar src={u.avatar} name={u.display_name || u.username} userId={u.id} size={36} onClick={() => setSelectedUserId(u.id)} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="flex items-center gap-1.5">
                    <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ltext)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.display_name || u.username}
                    </p>
                    <RolePill role={u.staff_role} />
                    {u.is_pro && <Crown size={11} style={{ color: 'var(--amber)', flexShrink: 0 }} />}
                    {u.is_banned && <ShieldBan size={11} style={{ color: 'var(--lred)', flexShrink: 0 }} />}
                  </div>
                  <p style={{ fontSize: 10.5, color: 'var(--ltext-muted)', margin: '1px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.email}
                  </p>
                </div>
                <div style={{
                  textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 12.5, fontWeight: 800, color: u.balance_flagged ? 'var(--lred)' : 'var(--amber)',
                }}>
                  {u.balance_flagged ? <AlertTriangle size={12} /> : <Gem size={12} />}
                  {u.gem_balance.toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between" style={{ marginTop: 18 }}>
            <button
              type="button"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--lborder)', borderRadius: 9, padding: '6px 10px',
                color: page <= 1 ? 'var(--ltext-muted)' : 'var(--ltext-sec)', fontSize: 12, cursor: page <= 1 ? 'default' : 'pointer',
              }}
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <span style={{ fontSize: 11.5, color: 'var(--ltext-muted)' }}>Page {page} of {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--lborder)', borderRadius: 9, padding: '6px 10px',
                color: page >= totalPages ? 'var(--ltext-muted)' : 'var(--ltext-sec)', fontSize: 12, cursor: page >= totalPages ? 'default' : 'pointer',
              }}
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        )}
      </AdminDrawer>

      <AdminUserDetailDrawer
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onBack={() => setSelectedUserId(null)}
      />
    </>
  )
}
