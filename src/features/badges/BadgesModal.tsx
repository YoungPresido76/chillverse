// src/features/badges/BadgesModal.tsx
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { BadgeIcon } from './badgeIcons'
import { BADGE_RARITY_COLOR, BADGE_RARITY_RANK, badgeDisplayTitle, type BadgeDef, type PlayerBadge } from './badges'
import BadgeToast from './BadgeToast'

const PREVIEW_COUNT = 6

// Opened by tapping the "Badges" stat row on a profile — same pattern as
// achievements: a header showing "collected / total", then a grid of
// the player's top 6 (rarest first). Tapping one shows the slide-down
// name toast, same as the inline row.
export default function BadgesModal({
  badges, allDefs, originalUsername, onClose,
}: {
  badges: PlayerBadge[]
  allDefs: BadgeDef[]
  /** The player's frozen original_username — NOT their current username. */
  originalUsername: string
  onClose: () => void
}) {
  const [toast, setToast] = useState<BadgeDef | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])
  function close() { setVisible(false); setTimeout(onClose, 280) }

  const defById = new Map(allDefs.map(d => [d.id, d]))
  const owned = [...badges]
    .map(b => defById.get(b.badge_id))
    .filter((d): d is BadgeDef => !!d)
    .sort((a, b) => (BADGE_RARITY_RANK[a.rarity] ?? 9) - (BADGE_RARITY_RANK[b.rarity] ?? 9))

  const preview = owned.slice(0, PREVIEW_COUNT)
  const totalBadges = allDefs.length

  return (
    <>
      <div className="overlay-backdrop" onClick={close} style={{ zIndex: 500 }} />
      {/* Mobile: bottom sheet | Desktop (lg+): centered modal */}
      <div className="sheet-or-modal" style={{ zIndex: 505 }}>
        <div
          className="sheet-or-modal-inner"
          onClick={e => e.stopPropagation()}
          style={{ maxHeight: '72vh', overflowY: 'auto', background: 'var(--surface2)', padding: '24px 20px 36px', transform: visible ? 'translateY(0)' : 'translateY(100%)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>Badges</p>
            <button type="button" onClick={close} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 18 }}>{owned.length}/{totalBadges} collected</p>

          {owned.length === 0 ? (
            <div style={{ padding: '30px 0', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No badges yet.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {preview.map(def => {
                const color = BADGE_RARITY_COLOR[def.rarity] ?? '#888899'
                return (
                  <button
                    key={def.id}
                    type="button"
                    onClick={() => setToast(def)}
                    className="ripple-wrap"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '14px 8px', borderRadius: 16, background: 'var(--surface)', border: `1px solid ${color}33`, cursor: 'pointer' }}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: color + '1c' }}>
                      <BadgeIcon iconKey={def.icon} size={19} color={color} />
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.25 }}>
                      {def.is_dynamic_username ? def.title : def.title}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <BadgeToast
          title={badgeDisplayTitle(toast, originalUsername)}
          icon={toast.icon}
          rarity={toast.rarity}
          onDone={() => setToast(null)}
        />
      )}
    </>
  )
}
