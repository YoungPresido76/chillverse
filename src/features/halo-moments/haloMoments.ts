// src/features/halo-moments/haloMoments.ts
//
// Client API layer for the "Halo Moments" pre-generated content pool
// (halo_lines / halo_line_history, see migration 0063). Every feature that
// wants a Halo line goes through here rather than querying halo_lines
// directly, so the picking logic (and any future swap from Tier A
// pre-generated to Tier B live-AI for a given moment type) stays in one
// place. Mirrors the client-API-layer style of weeklyMissions.ts.
//
// Currently wired up: 'fortune' (Daily Fortune), 'streak_milestone'
// (Streak tie-in), 'halo_saw_that' (achievement-unlock reaction toast).
// The remaining moment types from the halo_lines check constraint
// (mystery_box_win/empty, challenge_intro, random_surprise, lucky_user,
// inactivity_nudge) are content-ready but not yet wired to a feature.

import { supabase } from '../../shared/lib/supabase'

export type HaloMomentType =
  | 'fortune'
  | 'mystery_box_win'
  | 'mystery_box_empty'
  | 'streak_milestone'
  | 'challenge_intro'
  | 'halo_saw_that'
  | 'random_surprise'
  | 'lucky_user'
  | 'inactivity_nudge'

export interface HaloLine {
  id: string
  text: string
}

// Icon + toast type shared by every Halo moment that surfaces as a
// realtime notification toast (see useNotificationToast.ts / 'halo' entry
// in its TYPE_COLOR map).
const HALO_NOTIFICATION_ICON = 'sparkles'
const HALO_NOTIFICATION_TYPE = 'halo'

/**
 * Picks the next unseen line for a moment type via the get_next_halo_line()
 * RPC (migration 0063) — excludes whichever line this user was shown last
 * for that type, and records the new pick as "last shown".
 */
export async function getNextHaloLine(momentType: HaloMomentType): Promise<HaloLine | null> {
  const { data, error } = await supabase.rpc('get_next_halo_line', { p_moment_type: momentType })
  if (error) {
    console.error('[haloMoments] getNextHaloLine error:', error.message)
    return null
  }
  const row = (Array.isArray(data) ? data[0] : data) as { id?: string; text?: string } | null
  if (!row?.id || !row.text) return null
  return { id: row.id, text: row.text }
}

export interface DailyFortune {
  id: string
  text: string
  fortuneDate: string
}

/**
 * Idempotent per user/UTC-day — safe to call on every app load. Returns the
 * same fortune all day once one's been picked (migration 0065).
 */
export async function getOrCreateDailyFortune(): Promise<DailyFortune | null> {
  const { data, error } = await supabase.rpc('get_or_create_daily_fortune')
  if (error) {
    console.error('[haloMoments] getOrCreateDailyFortune error:', error.message)
    return null
  }
  const row = (Array.isArray(data) ? data[0] : data) as
    | { id?: string; text?: string; fortune_date?: string }
    | null
  if (!row?.id || !row.text) return null
  return { id: row.id, text: row.text, fortuneDate: row.fortune_date ?? '' }
}

/**
 * Shared helper — inserts a 'halo' notification for `userId`, which the
 * existing realtime toast pipeline (useNotificationToast.ts, subscribed in
 * AppLayout via NotificationToastRenderer) picks up and shows automatically.
 * Never throws — a failed Halo flourish should never break the feature it's
 * attached to.
 */
async function pushHaloNotification(userId: string, line: HaloLine): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type: HALO_NOTIFICATION_TYPE,
    title: line.text,
    body: 'Halo',
    icon: HALO_NOTIFICATION_ICON,
  })
  if (error) console.error('[haloMoments] pushHaloNotification error:', error.message)
}

/**
 * Streak tie-in (plan §4.4) — call this alongside the existing
 * checkStreakMilestoneHighlight() when a streak milestone is hit. Doesn't
 * touch streak logic or rewards, purely adds Halo's voice on top via the
 * existing notification-toast pipeline.
 */
export async function notifyStreakMilestoneHalo(userId: string): Promise<void> {
  try {
    const line = await getNextHaloLine('streak_milestone')
    if (!line) return
    await pushHaloNotification(userId, line)
  } catch (err) {
    console.error('[haloMoments] notifyStreakMilestoneHalo error:', err)
  }
}

/**
 * "Halo Saw That" (plan §4.7) — fire-and-forget, low-frequency reaction
 * fired after a real achievement event. `chance` defaults to the plan's
 * "1-in-4" spec. Never awaited by callers for its result — always
 * fire-and-forget (`.catch(console.error)` at the call site), same
 * convention as triggerAchievementCheck.
 */
export async function notifyHaloSawThat(userId: string, chance = 0.25): Promise<void> {
  try {
    if (Math.random() >= chance) return
    const line = await getNextHaloLine('halo_saw_that')
    if (!line) return
    await pushHaloNotification(userId, line)
  } catch (err) {
    console.error('[haloMoments] notifyHaloSawThat error:', err)
  }
}
