// src/features/admin/AdminUserSearch.tsx
//
// Two ways to reach this component:
//  1. The search icon next to the wing tabs — a small anchored dropdown
//     the admin types into (`variant="dropdown"`, the original behaviour).
//  2. Clicking an Overview stat card (New (7d), Active (7d), Staff
//     members, Banned users, etc.) — `variant="modal"`, a centered
//     overlay that loads the matching category immediately with no
//     typing required, since those cards live all over the stats grid
//     rather than next to the tab row this dropdown used to anchor to.
// Both variants share the same fetch/list/paginate logic; only the
// positioning and the "type to search" vs "loads on open" framing differ.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, AlertTriangle, Crown, ShieldCheck, ShieldBan, Gem, X } from 'lucide-react'
import Avatar from '../../shared/components/Avatar'
import { fetchAdminUserList, type AdminUserRow, type AdminUserFilter } from './adminStats'

const PAGE_SIZE = 20

interface AdminUserSearchProps {
  onClose: () => void
  /** Pre-applies one of the Overview categories instead of requiring a typed search. */
  filter?: AdminUserFilter
  /** Header shown when `filter` is set, e.g. "Banned users". */
  title?: string
  variant?: 'dropdown' | 'modal'
}

function RolePill({ role }: { role: AdminUserRow['staff_role'] }) {
  if (!role || role === 'user') return null
  const color = role === 'admin' ? 'var(--red)' : role === 'moderator' ? 'var(--blue)' : 'var(--purple)'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 800,
      textTransform: 'uppercase', letterSpacing: '0.04em', color, background: `${color}1c`,
      border: `1px solid ${color}40`, borderRadius: 6, padding: '1px 5px', flexShrink: 0,
    }}>
      <ShieldCheck size={8} /> {role}
    </span>
  )
}

function UserRow({ u, onSelect }: { u: AdminUserRow; onSelect: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(u.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left',
        borderRadius: 10, padding: '8px 8px', cursor: 'pointer', background: 'transparent', border: 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <Avatar src={u.avatar} name={u.display_name || u.username} size={30} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="flex items-center gap-1.5">
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {u.display_name || u.username}
          </p>
          <RolePill role={u.staff_role} />
          {u.is_pro && <Crown size={10} style={{ color: 'var(--gold)', flexShrink: 0 }} />}
          {u.is_banned && <ShieldBan size={10} style={{ color: 'var(--red)', flexShrink: 0 }} />}
        </div>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '1px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {u.email}
        </p>
      </div>
      <div style={{
        textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 11, fontWeight: 800, color: u.balance_flagged ? 'var(--red)' : 'var(--gold)',
      }}>
        {u.balance_flagged ? <AlertTriangle size={10} /> : <Gem size={10} />}
        {u.gem_balance.toLocaleString()}
      </div>
    </button>
  )
}

export default function AdminUserSearch({ onClose, filter, title, variant = 'dropdown' }: AdminUserSearchProps) {
  const navigate = useNavigate()
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [rows, setRows] = useState<AdminUserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(variant === 'modal')
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  // Dropdown variant autofocuses so typing starts immediately. Modal
  // variant (opened from a stat card) has nothing to type until the admin
  // wants to narrow the category, so it doesn't steal focus on open.
  useEffect(() => { if (variant === 'dropdown') inputRef.current?.focus() }, [variant])

  // Close on outside click or Escape.
  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onClose()
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Fetches page 1 whenever the search term (or the fixed filter) changes.
  // The modal variant always loads on open — it's an explicit drill-down
  // request from a stat card, even "Total users" with no category filter
  // at all. The dropdown variant keeps the original type-to-search
  // behaviour so the small anchored panel doesn't dump the whole user
  // list the moment the search icon is tapped.
  useEffect(() => {
    let active = true
    setError('')
    const shouldLoad = variant === 'modal' || !!filter || !!debouncedSearch.trim()
    if (!shouldLoad) {
      setRows([])
      setTotal(0)
      setPage(1)
      setLoading(false)
      return
    }
    setLoading(true)
    fetchAdminUserList(1, PAGE_SIZE, debouncedSearch, filter).then(({ data, error }) => {
      if (!active) return
      if (error) setError(error)
      setRows(data?.rows ?? [])
      setTotal(data?.total ?? 0)
      setPage(1)
      setLoading(false)
    })
    return () => { active = false }
  }, [debouncedSearch, filter, variant])

  async function loadMore() {
    setLoadingMore(true)
    const nextPage = page + 1
    const { data, error } = await fetchAdminUserList(nextPage, PAGE_SIZE, debouncedSearch, filter)
    setLoadingMore(false)
    if (error) { setError(error); return }
    setRows(prev => [...prev, ...(data?.rows ?? [])])
    setPage(nextPage)
  }

  function selectUser(id: string) {
    onClose()
    navigate(`/admin/users/${id}`)
  }

  const hasMore = rows.length < total
  const showEmptyPrompt = variant === 'dropdown' && !filter && !debouncedSearch.trim()

  const body = (
    <>
      <div style={{ position: 'relative', padding: 10 }}>
        <Search size={13} style={{ position: 'absolute', left: 22, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          ref={inputRef}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={filter ? 'Narrow by username, name, or email…' : 'Search username, name, or email…'}
          style={{
            width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10,
            padding: '9px 12px 9px 32px', fontSize: 12.5, color: 'var(--text)', outline: 'none',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--accent) 45%, transparent)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
        />
      </div>

      <div style={{ maxHeight: variant === 'modal' ? 420 : 320, overflowY: 'auto', borderTop: '1px solid var(--border)' }}>
        {error ? (
          <p style={{ fontSize: 11.5, color: 'var(--red)', textAlign: 'center', padding: '18px 12px' }}>{error}</p>
        ) : showEmptyPrompt ? (
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center', padding: '18px 12px' }}>
            Start typing to find a user.
          </p>
        ) : loading ? (
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center', padding: '18px 12px' }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center', padding: '18px 12px' }}>No matches.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', padding: 6, gap: 2 }}>
            {rows.map(u => <UserRow key={u.id} u={u} onSelect={selectUser} />)}
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  margin: '4px 4px 2px', padding: '9px', borderRadius: 9, border: '1px solid var(--border)',
                  background: 'var(--surface2)', color: 'var(--text-dim)', fontSize: 11.5, fontWeight: 700,
                  cursor: loadingMore ? 'default' : 'pointer', opacity: loadingMore ? 0.6 : 1,
                }}
              >
                {loadingMore ? 'Loading…' : `Load more (${total - rows.length} remaining)`}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )

  if (variant === 'modal') {
    return (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '10vh 16px 16px',
        }}
        onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <div
          ref={wrapRef}
          className="neu-card"
          style={{
            width: 420, maxWidth: '100%', borderRadius: 16, background: 'var(--surface)',
            border: '1px solid var(--border)', boxShadow: '0 20px 48px rgba(0,0,0,0.5)', overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 14px 0' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{title ?? 'Users'}</p>
              {!loading && !error && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>{total.toLocaleString()} total</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 28, height: 28, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>
          </div>
          {body}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={wrapRef}
      className="neu-card"
      style={{
        position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 20,
        width: 320, maxWidth: 'calc(100vw - 40px)', borderRadius: 14,
        boxShadow: '0 12px 28px rgba(0,0,0,0.4), 4px 4px 12px var(--neu-dark)',
        border: '1px solid var(--border)', background: 'var(--surface)',
        overflow: 'hidden',
      }}
    >
      {body}
    </div>
  )
}
