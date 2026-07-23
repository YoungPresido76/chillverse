// src/features/missions/weeklyMissions.ts
//
// Weekly missions client layer. As of migration 0051 all mission state
// transitions happen server-side in two SECURITY DEFINER RPCs:
//
//   get_or_create_weekly_missions()  — atomic (ON CONFLICT) creation of the
//     week's row with the selection constraints enforced in SQL, returning
//     the row plus its mission definitions in one round-trip.
//   record_mission_progress(metric, increment, absolute) — row-locked,
//     atomic progress update; completion detection, XP/diamond/booster
//     granting, ledger writes, and notifications all happen inside the
//     function. Rewards can no longer be minted from the client: the
//     user_weekly_missions RLS policy is now SELECT-only and user_wallets
//     has no client write path.
//
// The exported function signatures are unchanged so existing call sites
// (games, chat, mall, streak) don't need edits. userId parameters are
// retained for compatibility but ignored — the server derives the user
// from auth.uid().
import { supabase } from '../../shared/lib/supabase'

// ── Types ────────────────────────────────────────────────────────────────────

export interface MissionDefinition {
  id: string
  title: string
  description: string
  /** Lucide icon key (kebab-case, e.g. "flame", "message-circle") —
   *  resolve via getMissionIcon() from ./missionIcons. Never an emoji. */
  icon: string
  icon_color: string
  category: string
  metric_key: string
  target_value: number
  /** 'consumable' means the reward will eventually be a consumable item —
   *  that granting logic isn't built yet, so it currently pays out xp_reward
   *  as an interim reward, same as 'xp'. */
  reward_type: 'xp' | 'xp_and_booster' | 'consumable'
  xp_reward: number
  diamond_reward: number
  reward_label: string
  is_spend: boolean
  is_active: boolean
}

export interface UserWeeklyMission {
  id: string
  user_id: string
  week_start: string
  mission_ids: string[]
  progress: Record<string, number>
  completed_ids: string[]
  total_xp_earned: number
  total_diamonds_earned: number
  boosters_earned: number
  /** One-time bonus XP granted the moment every selected mission for the
   *  week is completed — scaled to that week's total mission difficulty. */
  bonus_xp_earned: number
  bonus_claimed: boolean
}

export interface MissionWithProgress extends MissionDefinition {
  current_progress: number
  is_completed: boolean
}

export interface WeeklyMissionsResult {
  missions: MissionWithProgress[]
  row: UserWeeklyMission | null
}

// ── Week helpers (display only — the server computes its own week) ──────────

export function getWeekStart(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() // 0=Sun, 1=Mon … 6=Sat
  const diff = day === 0 ? 6 : day - 1
  d.setUTCDate(d.getUTCDate() - diff)
  return d.toISOString().slice(0, 10)
}

export function getTimeUntilReset(): { days: number; hours: number; minutes: number } {
  const now = new Date()
  const nextMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const day = nextMonday.getUTCDay()
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day
  nextMonday.setUTCDate(nextMonday.getUTCDate() + daysUntilMonday)

  const diffMs = nextMonday.getTime() - now.getTime()
  if (diffMs <= 0) return { days: 0, hours: 0, minutes: 0 }

  const totalMinutes = Math.floor(diffMs / 60000)
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
  }
}

// ── Shared mapping ───────────────────────────────────────────────────────────

function mapRowToMissions(
  row: UserWeeklyMission,
  definitions: MissionDefinition[]
): MissionWithProgress[] {
  const progress = row.progress ?? {}
  const completedIds = row.completed_ids ?? []
  const missions = definitions.map(def => ({
    ...def,
    current_progress: progress[def.metric_key] ?? 0,
    is_completed: completedIds.includes(def.id),
  }))
  missions.sort((a, b) => {
    if (a.is_completed === b.is_completed) return 0
    return a.is_completed ? 1 : -1
  })
  return missions
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Fetches (or atomically creates) this week's missions, returning both the
 *  mapped mission list and the authoritative row (with server-tracked
 *  total_xp_earned / total_diamonds_earned / boosters_earned). */
export async function getWeeklyMissions(): Promise<WeeklyMissionsResult> {
  const { data, error } = await supabase.rpc('get_or_create_weekly_missions')
  if (error || !data?.row) {
    if (error) console.error('[weeklyMissions] get_or_create failed:', error)
    return { missions: [], row: null }
  }
  const row = data.row as UserWeeklyMission
  const definitions = (data.definitions ?? []) as MissionDefinition[]
  return { missions: mapRowToMissions(row, definitions), row }
}

/** Back-compat wrapper — userId is ignored (server uses auth.uid()). */
export async function getOrCreateWeeklyMissions(_userId?: string): Promise<MissionWithProgress[]> {
  const { missions } = await getWeeklyMissions()
  return missions
}

/** Records progress on a metric. Completion detection and all reward
 *  granting happen server-side, atomically, inside the RPC.
 *  userId is ignored (server uses auth.uid()). */
export async function updateMissionProgress(
  _userId: string,
  metricKey: string,
  incrementBy: number = 1,
  /** If true, sets the metric to max(current, incrementBy) instead of adding */
  absolute: boolean = false
): Promise<void> {
  const { error } = await supabase.rpc('record_mission_progress', {
    p_metric_key: metricKey,
    p_increment: incrementBy,
    p_absolute: absolute,
  })
  if (error) console.error('[weeklyMissions] record_mission_progress failed:', error)

  // Halo's Daily Challenge (migration 0068) tracks a subset of these same
  // metric keys — fired in parallel from this single choke point rather
  // than at every individual call site (Chat.tsx, Mall.tsx, Games.tsx,
  // gameSession.ts, Streak.tsx). The RPC itself no-ops if today's challenge
  // doesn't use this metric, so this is safe to call unconditionally.
  supabase
    .rpc('record_halo_challenge_progress', {
      p_metric_key: metricKey,
      p_increment: incrementBy,
      p_absolute: absolute,
    })
    .then(({ error: haloErr }) => {
      if (haloErr) console.error('[weeklyMissions] record_halo_challenge_progress failed:', haloErr)
    })
}

// ── Client-side tracking helpers ─────────────────────────────────────────────
//
// A handful of missions need "how many distinct X this week" (e.g. 3
// different chat rooms, 3 different DM recipients) rather than a plain
// counter. record_mission_progress only ever stores a single number per
// metric, so uniqueness is tracked in localStorage (week-scoped) and the
// resulting set size is sent up as an absolute value.

function uniqueSetKey(userId: string, metricKey: string): string {
  return `cv:mission-set:${userId}:${metricKey}:${getWeekStart(new Date())}`
}

/** Adds `value` to this week's unique set for `metricKey` and reports the
 *  new set size to the server as an absolute progress value. Safe to call
 *  on every occurrence — duplicates don't grow the set or re-trigger a
 *  network call. */
export async function trackWeeklyUniqueValue(
  userId: string,
  metricKey: string,
  value: string
): Promise<void> {
  if (!userId || !value) return
  try {
    const key = uniqueSetKey(userId, metricKey)
    const raw = localStorage.getItem(key)
    const set = new Set<string>(raw ? (JSON.parse(raw) as string[]) : [])
    if (set.has(value)) return
    set.add(value)
    localStorage.setItem(key, JSON.stringify([...set]))
    await updateMissionProgress(userId, metricKey, set.size, true)
  } catch (err) {
    console.error('[weeklyMissions] trackWeeklyUniqueValue failed:', err)
  }
}

/** For metrics driven by a lifetime running total the client already has
 *  (e.g. referral count), reports only the *new* delta since last seen so
 *  the weekly mission isn't instantly complete from old activity. Baseline
 *  is stored per-user, not week-scoped, since it tracks "already counted". */
export async function trackDeltaMetric(
  userId: string,
  metricKey: string,
  currentTotal: number
): Promise<void> {
  if (!userId || !Number.isFinite(currentTotal)) return
  try {
    const key = `cv:mission-baseline:${userId}:${metricKey}`
    const baseline = Number(localStorage.getItem(key) ?? '0')
    if (currentTotal <= baseline) return
    const delta = currentTotal - baseline
    localStorage.setItem(key, String(currentTotal))
    await updateMissionProgress(userId, metricKey, delta, false)
  } catch (err) {
    console.error('[weeklyMissions] trackDeltaMetric failed:', err)
  }
}

/** Marks `dayKey` (e.g. an ISO date) as active for a "N different days"
 *  style mission and reports the new distinct-day count. */
export async function trackWeeklyActiveDay(
  userId: string,
  metricKey: string,
  dayKey: string = new Date().toISOString().slice(0, 10)
): Promise<void> {
  return trackWeeklyUniqueValue(userId, metricKey, dayKey)
}
