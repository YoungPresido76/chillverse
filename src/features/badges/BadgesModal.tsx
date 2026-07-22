// src/features/badges/BadgesModal.tsx
import { useState, useEffect, useMemo } from 'react'
import { X, ChevronLeft, Lock, Check } from 'lucide-react'
import { BadgeIcon } from './badgeIcons'
import { BADGE_RARITY_COLOR, BADGE_RARITY_RANK, badgeDisplayTitle, type BadgeDef, type PlayerBadge } from './badges'
import { proBadgeSrc, subscriberBadgeTier } from './ProBadge'
import type { ProInfo } from './BadgeQuickSheet'

function formatUnlockedDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

// Opened by tapping the "Badges" stat row on a profile. A single tall
// sheet (never Discord's side-by-side list+detail box) — the full
// catalog as a scrollable list, owned badges first, then what's left to
// unlock. Tapping a row swaps the list out for that badge's detail
// (rarity, unlock date, how to get it) with a back arrow to return —
// same list/detail *idea* as Discord's badge browser, just stacked
// instead of two panes.
export default function BadgesModal({
  badges, allDefs, originalUsername, pro, onClose,
}: {
  badges: PlayerBadge[]
  allDefs: BadgeDef[]
  /** The player's frozen original_username — NOT their current username. */
  originalUsername: string
  /** Needed to render the real evolving-color png for the owned Orbit/Void badge. */
  pro?: ProInfo | null
  onClose: () => void
}) {
  const [selected, setSelected] = useState<BadgeDef | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])
  function close() { setVisible(false); setTimeout(onClose, 280) }

  const unlockedAtById = useMemo(() => new Map(badges.map(b => [b.badge_id, b.unlocked_at])), [badges])

  // Owned badges first (rarest first), then everything still locked —
  // available-to-earn before retired/no-longer-available ones, each
  // group sorted by rarity too. One flat list, no tabs.
  const sorted = useMemo(() => {
    const owned: BadgeDef[] = []
    const lockedAvailable: BadgeDef[] = []
    const lockedRetired: BadgeDef[] = []
    for (const def of allDefs) {
      if (unlockedAtById.has(def.id)) owned.push(def)
      else if (def.is_available) lockedAvailable.push(def)
      else lockedRetired.push(def)
    }
    const byRarity = (a: BadgeDef, b: BadgeDef) => (BADGE_RARITY_RANK[a.rarity] ?? 9) - (BADGE_RARITY_RANK[b.rarity] ?? 9)
    return [...owned.sort(byRarity), ...lockedAvailable.sort(byRarity), ...lockedRetired.sort(byRarity)]
  }, [allDefs, unlockedAtById])

  const ownedCount = unlockedAtById.size
  const totalCount = allDefs.length

  return (
    <>
      <div className="overlay-backdrop" onClick={close} style={{ zIndex: 500 }} />
      {/* Mobile: tall bottom sheet | Desktop (lg+): centered modal — the
          canonical primitive, just given more room to breathe since it
          now holds the full catalog instead of a 6-tile preview. */}
      <div className="sheet-or-modal" style={{ zIndex: 505 }}>
        <div
          className="sheet-or-modal-inner"
          onClick={e => e.stopPropagation()}
          style={{
            height: '82vh', maxHeight: '82vh', display: 'flex', flexDirection: 'column',
            background: 'var(--surface2)', transform: visible ? 'translateY(0)' : 'translateY(100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 4px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {selected && (
                <button
                  type="button" onClick={() => setSelected(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 6px 2px 0', display: 'flex' }}
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <div>
                <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>{selected ? selected.title : 'Badges'}</p>
                {!selected && <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-dim)' }}>{ownedCount}/{totalCount} collected</p>}
              </div>
            </div>
            <button type="button" onClick={close} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '14px 20px 32px' }}>
            {selected ? (
              <BadgeDetail def={selected} unlockedAt={unlockedAtById.get(selected.id) ?? null} pro={pro} originalUsername={originalUsername} />
            ) : sorted.length === 0 ? (
              <div style={{ padding: '30px 0', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No badges yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sorted.map(def => {
                  const unlockedAt = unlockedAtById.get(def.id) ?? null
                  const owned = !!unlockedAt
                  const color = BADGE_RARITY_COLOR[def.rarity] ?? '#888899'
                  const isSubscriberBadge = !!subscriberBadgeTier(def.id)
                  return (
                    <button
                      key={def.id}
                      type="button"
                      onClick={() => setSelected(def)}
                      className="ripple-wrap"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 14,
                        background: 'var(--surface)', border: `1px solid ${owned ? color + '33' : 'var(--border)'}`,
                        cursor: 'pointer', textAlign: 'left', opacity: owned ? 1 : 0.55,
                      }}
                    >
                      <div style={{ width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: color + '1c', flexShrink: 0, position: 'relative' }}>
                        {isSubscriberBadge
                          ? <img src={proBadgeSrc(pro?.color)} alt={def.title} width={19} height={19} style={{ display: 'block', filter: owned ? 'none' : 'grayscale(1)' }} />
                          : <BadgeIcon iconKey={def.icon} size={19} color={owned ? color : 'var(--text-muted)'} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {badgeDisplayTitle(def, originalUsername)}
                        </p>
                        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginTop: 1 }}>
                          {owned ? `Unlocked ${formatUnlockedDate(unlockedAt as string)}` : def.is_available ? 'Locked' : 'No longer available'}
                        </p>
                      </div>
                      {owned
                        ? <Check size={16} style={{ color, flexShrink: 0 }} />
                        : <Lock size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// The detail pane swapped in when a row is tapped — icon, rarity pill,
// unlock status, and the description (what it takes to get it).
function BadgeDetail({
  def, unlockedAt, pro, originalUsername,
}: {
  def: BadgeDef
  unlockedAt: string | null
  pro?: ProInfo | null
  originalUsername: string
}) {
  const color = BADGE_RARITY_COLOR[def.rarity] ?? '#888899'
  const isSubscriberBadge = !!subscriberBadgeTier(def.id)
  const owned = !!unlockedAt

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 8 }}>
      <div style={{ width: 68, height: 68, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: color + '1c', marginBottom: 14 }}>
        {isSubscriberBadge
          ? <img src={proBadgeSrc(pro?.color)} alt={def.title} width={34} height={34} style={{ display: 'block', filter: owned ? 'none' : 'grayscale(1)' }} />
          : <BadgeIcon iconKey={def.icon} size={34} color={owned ? color : 'var(--text-muted)'} />}
      </div>

      <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
        {badgeDisplayTitle(def, originalUsername)}
      </p>
      <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 16 }}>
        {owned ? `Unlocked ${formatUnlockedDate(unlockedAt as string)}` : def.is_available ? 'Not yet unlocked' : 'No longer available'}
      </p>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: color + '1c', border: `1px solid ${color}44`, marginBottom: 18 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
        <span style={{ fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: 0.4 }}>{def.rarity}</span>
      </div>

      {def.description && (
        <div style={{ width: '100%', padding: '12px 14px', borderRadius: 13, background: 'var(--surface)', border: '1px solid var(--border)', textAlign: 'left' }}>
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>{def.description}</p>
        </div>
      )}
    </div>
  )
}
