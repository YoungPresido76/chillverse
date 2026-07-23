// src/pages/WeeklyMissions.tsx
import { useEffect, useRef, useState } from 'react'
import { Clock, Sparkles, Check, Zap, PartyPopper } from 'lucide-react'
import { ripple } from '../../shared/lib/ripple'
import { useWeeklyMissions } from './useWeeklyMissions'
import { MissionIcon, getMissionIcon } from './missionIcons'
import type { MissionWithProgress } from './weeklyMissions'
import PageOnboarding from '../onboarding/PageOnboarding'

// ── CountdownChip ─────────────────────────────────────────────────────────────

function CountdownChip({ days, hours, minutes }: { days: number; hours: number; minutes: number }) {
  return (
    <div style={{
      background: 'var(--surface2)',
      border: '1px solid rgba(155,109,255,0.22)',
      borderRadius: 12,
      padding: '7px 12px',
      boxShadow: 'var(--elev-raise)',
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      flexShrink: 0,
    }}>
      <Clock size={13} color="#9b6dff" />
      <div>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.4, lineHeight: 1 }}>
          Resets in
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#9b6dff', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
          {days}d {hours}h {minutes}m
        </div>
      </div>
    </div>
  )
}

// ── HexBadge — plain hex chip used inside reward pills ───────────────────────

function HexBadge({
  color, size = 30, children,
}: { color: string; size?: number; children?: React.ReactNode }) {
  return (
    <div style={{
      width: size,
      height: size,
      clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
      background: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      flexShrink: 0,
    }}>
      {children}
    </div>
  )
}

// ── HexMissionTile — the fill-on-complete hex used in the footer tracker ────

function HexMissionTile({ mission }: { mission: MissionWithProgress }) {
  const Icon = getMissionIcon(mission.icon)
  const pct = Math.min(100, Math.round((mission.current_progress / Math.max(mission.target_value, 1)) * 100))
  const color = mission.icon_color

  return (
    <div
      title={`${mission.title} — ${mission.current_progress}/${mission.target_value}`}
      style={{
        position: 'relative',
        width: 34,
        height: 38,
        flexShrink: 0,
      }}
    >
      {/* Empty hex outline */}
      <div style={{
        position: 'absolute', inset: 0,
        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
        background: 'var(--surface3)',
        boxShadow: 'var(--elev-inset)',
      }} />
      {/* Fill — clipped bottom-up by completion pct, hexagon-clipped so it
          never spills past the hex silhouette */}
      <div style={{
        position: 'absolute', inset: 0,
        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
        overflow: 'hidden',
      }}>
        <div
          className={mission.is_completed ? 'hex-fill-complete' : undefined}
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            height: `${pct}%`,
            background: `linear-gradient(180deg, ${color}cc, ${color})`,
            transition: 'height 0.7s cubic-bezier(0.22,1,0.36,1)',
            boxShadow: mission.is_completed ? `0 0 10px ${color}99` : 'none',
          }}
        />
      </div>
      {/* Icon on top */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {mission.is_completed
          ? <Check size={15} color="#fff" strokeWidth={3} />
          : <Icon size={14} color={pct > 45 ? '#fff' : color} strokeWidth={2.25} />}
      </div>
    </div>
  )
}

// ── RewardBadge — compact for mobile, with a wavy shine-on-glass sweep ──────

function RewardBadge({ mission }: { mission: MissionWithProgress }) {
  const base: React.CSSProperties = {
    position: 'relative',
    background: 'var(--surface3)',
    borderRadius: 10,
    padding: '6px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    boxShadow: 'var(--elev-inset)',
    flexShrink: 0,
    overflow: 'hidden',
  }

  if (mission.is_completed) {
    return (
      <div style={base}>
        <HexBadge color="#3ecf8e" size={24}><Check size={13} strokeWidth={3} /></HexBadge>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#3ecf8e', whiteSpace: 'nowrap' }}>Done!</span>
      </div>
    )
  }

  const isBooster = mission.reward_type === 'xp_and_booster'
  const isConsumable = mission.reward_type === 'consumable'

  return (
    <div className="reward-shine" style={base}>
      <span className="reward-shine-sweep" />
      <HexBadge color="#f5c542" size={26}>
        <span style={{ fontSize: 9, fontWeight: 800 }}>XP</span>
      </HexBadge>
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#f5c542', lineHeight: 1 }}>
          +{mission.xp_reward.toLocaleString()}
        </div>
        <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>
          {isConsumable ? 'XP (consumable soon)' : 'XP'}
        </div>
      </div>
      {isBooster && <HexBadge color="#9b6dff" size={22}><Zap size={11} strokeWidth={2.5} /></HexBadge>}
    </div>
  )
}

// ── MissionCard — two-row mobile-first layout ─────────────────────────────────

function MissionCard({ mission, index }: { mission: MissionWithProgress; index: number }) {
  const progressRef = useRef<HTMLDivElement>(null)
  const pct = Math.min(100, (mission.current_progress / mission.target_value) * 100)

  useEffect(() => {
    if (!mission.is_completed && progressRef.current) {
      const t = setTimeout(() => {
        if (progressRef.current) progressRef.current.style.width = `${pct}%`
      }, 100)
      return () => clearTimeout(t)
    }
  }, [pct, mission.is_completed])

  const cardInner: React.CSSProperties = {
    borderRadius: 14,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  }

  if (mission.is_completed) {
    return (
      <div className="su mission-glow-card" style={{ animationDelay: `${index * 0.07}s` }}>
        <div style={{
          ...cardInner,
          background: 'rgba(62,207,142,0.06)',
          border: '1px solid rgba(62,207,142,0.3)',
          boxShadow: '6px 6px 14px var(--neu-dark), -4px -4px 10px var(--neu-light), 0 0 16px rgba(62,207,142,0.1)',
        }}>
          {/* Row 1: icon + title + badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11, flexShrink: 0,
              background: `${mission.icon_color}26`,
              boxShadow: `0 0 12px ${mission.icon_color}40, 2px 2px 6px var(--neu-dark)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MissionIcon iconKey={mission.icon} size={19} color={mission.icon_color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
                {mission.title}
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4,
                background: 'rgba(62,207,142,0.15)', border: '1px solid rgba(62,207,142,0.3)',
                borderRadius: 20, padding: '2px 8px',
              }}>
                <Check size={11} color="#3ecf8e" strokeWidth={3} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#3ecf8e' }}>
                  Completed!
                </span>
              </div>
            </div>
            <RewardBadge mission={mission} />
          </div>
        </div>
      </div>
    )
  }

  // Active card — two rows
  return (
    <div
      className="su mission-active-card ripple-wrap"
      style={{ animationDelay: `${index * 0.07}s` }}
      onClick={(e) => ripple(e)}
    >
      <div
        style={{
          ...cardInner,
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--elev-raise)',
          transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'rgba(155,109,255,0.28)'
          el.style.transform = 'translateY(-1px)'
          el.style.boxShadow = '8px 8px 20px var(--neu-dark), -4px -4px 14px var(--neu-light)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'rgba(255,255,255,0.06)'
          el.style.transform = 'translateY(0)'
          el.style.boxShadow = '6px 6px 14px var(--neu-dark), -4px -4px 10px var(--neu-light)'
        }}
      >
        {/* Row 1: icon + title + fraction + badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Icon */}
          <div style={{
            width: 40, height: 40, borderRadius: 11, flexShrink: 0,
            background: `${mission.icon_color}1f`,
            boxShadow: `2px 2px 6px var(--neu-dark), -1px -1px 4px var(--neu-light)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MissionIcon iconKey={mission.icon} size={19} color={mission.icon_color} />
          </div>

          {/* Title + fraction — takes all remaining space */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 14, fontWeight: 700, color: 'var(--text)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {mission.title}
            </div>
            <div style={{ fontSize: 11, color: mission.icon_color, fontWeight: 600, marginTop: 1 }}>
              {mission.current_progress.toLocaleString()} / {mission.target_value.toLocaleString()}
            </div>
          </div>

          {/* Reward badge — right-aligned */}
          <RewardBadge mission={mission} />
        </div>

        {/* Row 2: description + progress bar */}
        <div>
          <div style={{
            fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: 7,
          }}>
            {mission.description}
          </div>
          <div style={{
            width: '100%', height: 4, borderRadius: 4,
            background: 'var(--surface3)',
            boxShadow: 'var(--elev-inset)',
            overflow: 'hidden',
          }}>
            <div ref={progressRef} style={{
              height: '100%', width: '0%', borderRadius: 4,
              background: 'linear-gradient(90deg, #9b6dff, #4f8ef7)',
              boxShadow: '0 0 8px rgba(155,109,255,0.5)',
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── WeeklyBonusBanner — appears once every mission for the week is done ────

function WeeklyBonusBanner({ bonusXp }: { bonusXp: number }) {
  return (
    <div className="su bonus-banner" style={{
      marginTop: 12,
      borderRadius: 16,
      padding: '14px 16px',
      background: 'linear-gradient(120deg, rgba(245,197,66,0.16), rgba(155,109,255,0.14))',
      border: '1px solid rgba(245,197,66,0.35)',
      boxShadow: '0 0 24px rgba(245,197,66,0.18)',
      display: 'flex', alignItems: 'center', gap: 12,
      position: 'relative', overflow: 'hidden',
    }}>
      <span className="bonus-shine-sweep" />
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: 'rgba(245,197,66,0.22)',
        boxShadow: '0 0 14px rgba(245,197,66,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <PartyPopper size={19} color="#f5c542" />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
          All missions cleared!
        </div>
        <div style={{ fontSize: 12, color: '#f5c542', fontWeight: 700, marginTop: 1 }}>
          +{bonusXp.toLocaleString()} bonus XP
        </div>
      </div>
    </div>
  )
}

// ── WeeklyProgressFooter ──────────────────────────────────────────────────────

function WeeklyProgressFooter({
  missions, totalXp, totalDiamonds, boosters, bonusXp, bonusClaimed,
}: {
  missions: MissionWithProgress[]
  totalXp: number
  totalDiamonds: number
  boosters: number
  bonusXp: number
  bonusClaimed: boolean
}) {
  const completed = missions.filter(m => m.is_completed).length
  const total = missions.length || 1
  const pct = Math.round((completed / total) * 100)

  return (
    <div className="neu-card" style={{
      background: 'var(--surface2)',
      borderRadius: 16,
      padding: '16px 18px',
      marginTop: 12,
      border: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
          Weekly Progress
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
          {completed} / {missions.length} completed
        </div>

        {/* Hex tracker — one hex per mission, fills with that mission's own
            icon + color as progress comes in */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
          {missions.map(m => <HexMissionTile key={m.id} mission={m} />)}
          <div style={{
            marginLeft: 4,
            background: 'var(--surface3)',
            borderRadius: 20,
            padding: '2px 9px',
            fontSize: 10,
            fontWeight: 700,
            color: pct > 0 ? '#9b6dff' : 'var(--text-muted)',
            boxShadow: 'var(--elev-inset)',
          }}>
            {pct}%
          </div>
        </div>

        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Total Weekly XP</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#9b6dff', lineHeight: 1.2 }}>
          {totalXp.toLocaleString()} XP
        </div>
        {totalDiamonds > 0 && (
          <div style={{ fontSize: 12, color: '#4f8ef7', marginTop: 3 }}>+{totalDiamonds} Diamonds</div>
        )}
        {boosters > 0 && (
          <div style={{ fontSize: 12, color: '#9b6dff', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Zap size={12} /> {boosters} Booster{boosters > 1 ? 's' : ''}
          </div>
        )}
        {bonusClaimed && bonusXp > 0 && (
          <div style={{ fontSize: 12, color: '#f5c542', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <PartyPopper size={12} /> +{bonusXp.toLocaleString()} weekly bonus
          </div>
        )}
      </div>

      {/* Crystal gem */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div className="gem-float" style={{
          width: 52, height: 60,
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          background: 'linear-gradient(135deg, #9b6dff 0%, #4f8ef7 60%, #3ecf8e 100%)',
          boxShadow: '0 0 20px rgba(155,109,255,0.5), 0 0 40px rgba(79,142,247,0.2)',
          margin: '0 auto',
        }} />
        {[{ top: -5, right: 2 }, { top: 8, right: -7 }, { bottom: 4, left: -5 }].map((pos, i) => (
          <div key={i} style={{
            position: 'absolute', width: 3, height: 3,
            borderRadius: '50%', background: '#fff', opacity: 0.65, ...pos,
          }} />
        ))}
        <div style={{
          width: 64, height: 7, borderRadius: '50%',
          background: 'rgba(155,109,255,0.3)', filter: 'blur(4px)', margin: '5px auto 0',
        }} />
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{
      height: 80, borderRadius: 14,
      background: 'var(--surface2)',
      boxShadow: 'var(--elev-raise)',
      animation: 'pulse 1.6s ease-in-out infinite',
    }} />
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WeeklyMissions() {
  const {
    missions, loading, weekProgress, totalMissionCount,
    totalXpEarned, totalDiamondsEarned, boostersEarned,
    bonusXpEarned, bonusClaimed, countdown,
  } = useWeeklyMissions()

  const sorted = [...missions].sort((a, b) => {
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1
    return b.current_progress / b.target_value - a.current_progress / a.target_value
  })

  const allCleared = totalMissionCount > 0 && weekProgress >= totalMissionCount

  // Only show the celebratory banner once per completion — a brand new
  // page load already showing bonusClaimed=true just renders it inline in
  // the footer instead of re-firing the "just happened" banner.
  const [justCompleted, setJustCompleted] = useState(false)
  const prevProgressRef = useRef(weekProgress)
  useEffect(() => {
    if (weekProgress > prevProgressRef.current && allCleared && bonusClaimed) {
      setJustCompleted(true)
    }
    prevProgressRef.current = weekProgress
  }, [weekProgress, allCleared, bonusClaimed])

  return (
    <div style={{ padding: '20px 14px 48px', maxWidth: 680, margin: '0 auto' }}>
      <PageOnboarding pageKey="weekly_missions" />

      {/* ── Header ── */}
      <div className="su" style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', gap: 12, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(155,109,255,0.25), rgba(79,142,247,0.15))',
            boxShadow: '4px 4px 12px var(--neu-dark), -2px -2px 8px var(--neu-light), 0 0 16px rgba(155,109,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={20} color="#9b6dff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{
              fontSize: 22, fontWeight: 800, color: 'var(--text)',
              margin: 0, lineHeight: 1.15,
            }}>
              Weekly Missions
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0', lineHeight: 1.3 }}>
              Complete missions, earn XP and level up faster.
            </p>
          </div>
        </div>

        <CountdownChip days={countdown.days} hours={countdown.hours} minutes={countdown.minutes} />
      </div>

      {/* ── Week progress strip ── */}
      {!loading && (
        <div className="su" style={{ animationDelay: '0.05s', marginBottom: 16 }}>
          <div style={{
            height: 3, borderRadius: 3,
            background: 'var(--surface3)',
            boxShadow: 'var(--elev-inset)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${(weekProgress / (totalMissionCount || 1)) * 100}%`,
              background: 'linear-gradient(90deg, #9b6dff, #4f8ef7)',
              boxShadow: '0 0 10px rgba(155,109,255,0.6)',
              transition: 'width 0.8s ease',
              borderRadius: 3,
            }} />
          </div>
        </div>
      )}

      {/* ── Just-cleared celebration banner ── */}
      {!loading && justCompleted && <WeeklyBonusBanner bonusXp={bonusXpEarned} />}

      {/* ── Cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: justCompleted ? 12 : 0 }}>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          : sorted.map((m, i) => <MissionCard key={m.id} mission={m} index={i} />)
        }
      </div>

      {/* ── Footer ── */}
      {!loading && (
        <WeeklyProgressFooter
          missions={missions}
          totalXp={totalXpEarned}
          totalDiamonds={totalDiamondsEarned}
          boosters={boostersEarned}
          bonusXp={bonusXpEarned}
          bonusClaimed={bonusClaimed}
        />
      )}

      <style>{`
        @keyframes missionGlow {
          from { border-color: rgba(62,207,142,0.22); }
          to   { border-color: rgba(62,207,142,0.52); }
        }
        .mission-glow-card > div {
          animation: missionGlow 2s ease-in-out infinite alternate;
        }
        @keyframes gemFloat {
          from { transform: translateY(0px); }
          to   { transform: translateY(-5px); }
        }
        .gem-float { animation: gemFloat 2s ease-in-out infinite alternate; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.45; }
        }
        .mission-active-card { cursor: pointer; }

        /* Wavy silver glow-on-glass sweep across an unclaimed reward chip */
        .reward-shine { isolation: isolate; }
        .reward-shine-sweep {
          position: absolute;
          top: -40%;
          left: -60%;
          width: 40%;
          height: 180%;
          background: linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.35) 45%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0.35) 55%, transparent 100%);
          transform: skewX(-18deg);
          animation: shineSweep 3.2s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes shineSweep {
          0%   { left: -60%; opacity: 0; }
          8%   { opacity: 1; }
          35%  { opacity: 1; }
          48%  { left: 130%; opacity: 0; }
          100% { left: 130%; opacity: 0; }
        }

        /* Hex tile pulse the instant it locks in as complete */
        @keyframes hexComplete {
          0%   { filter: brightness(1); }
          40%  { filter: brightness(1.6); }
          100% { filter: brightness(1); }
        }
        .hex-fill-complete { animation: hexComplete 0.9s ease-out; }

        /* Bonus banner shine + gentle pop-in */
        .bonus-banner { position: relative; }
        .bonus-shine-sweep {
          position: absolute; top: -50%; left: -70%;
          width: 45%; height: 200%;
          background: linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.28) 45%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0.28) 55%, transparent 100%);
          transform: skewX(-18deg);
          animation: shineSweep 3.6s ease-in-out infinite;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}
