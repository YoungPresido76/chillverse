// src/features/posts/AchievementTagPreview.tsx
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { getAchievementById, type Achievement } from '../achievements/achievements'
import { AchIcon, RARITY_COLOR, RARITY_GLOW } from '../achievements/Achievements'

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const color = RARITY_COLOR[achievement.rarity]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
      background: RARITY_GLOW[achievement.rarity], border: `1px solid ${color}33`,
      borderRadius: 16, boxShadow: `0 4px 20px ${color}22`,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 16, flexShrink: 0,
        background: `linear-gradient(135deg,${color}33,${color}11)`, border: `1.5px solid ${color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 16px ${color}33`,
      }}>
        <AchIcon iconKey={achievement.icon} size={24} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="flex items-center gap-2">
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{achievement.title}</p>
          <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 6, background: `${color}22`, color, textTransform: 'uppercase' }}>
            {achievement.rarity}
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{achievement.description}</p>
        <p style={{ fontSize: 11, color: color, fontWeight: 700, marginTop: 4 }}>+{achievement.xp_reward} XP</p>
      </div>
    </div>
  )
}

/** Inline rich preview — used when a post has exactly one achievement tag. */
export function AchievementTagInline({ achievementId }: { achievementId: string }) {
  const [achievement, setAchievement] = useState<Achievement | null>(null)

  useEffect(() => {
    let active = true
    getAchievementById(achievementId).then(a => { if (active) setAchievement(a) })
    return () => { active = false }
  }, [achievementId])

  if (!achievement) return null
  return <AchievementCard achievement={achievement} />
}

/** Modal preview — opened by tapping an achievement chip when a post has multiple tags. */
export function AchievementTagModal({ achievementId, onClose }: { achievementId: string; onClose: () => void }) {
  const [achievement, setAchievement] = useState<Achievement | null>(null)

  useEffect(() => {
    let active = true
    getAchievementById(achievementId).then(a => { if (active) setAchievement(a) })
    return () => { active = false }
  }, [achievementId])

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: 20 }}
      onClick={onClose}
    >
      <div className="neu-card" style={{ width: '100%', maxWidth: 360, padding: 18, position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
        >
          <X size={16} />
        </button>
        {achievement ? (
          <AchievementCard achievement={achievement} />
        ) : (
          <p style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', padding: 20 }}>Loading…</p>
        )}
      </div>
    </div>,
    document.body,
  )
}
