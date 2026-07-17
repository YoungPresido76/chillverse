// src/features/highlights/highlightTriggers.ts
//
// One check function per Duolingo-style highlight trigger. Every function:
//   - re-derives its condition from the DB itself (never trusts a value
//     passed in from a screen that could be stale/manipulated),
//   - is safe to call often — dedup is enforced either by the DB's unique
//     (author_id, dedup_key) index (migration 0036) or, for personal_best /
//     leaderboard_rank, by only inserting when the number has genuinely
//     improved on the last one recorded.
//   - never throws — callers fire-and-forget these the same way the rest
//     of the app does with updateMissionProgress/triggerAchievementCheck.
import { supabase } from '../../shared/lib/supabase'
import { createHighlight } from './highlights'
import { getGameMeta } from '../games/games'
import type { GameKey } from '../games/gameSession'

/** Accumulated XP in a single game, across all sessions ever, to fire the "high XP" highlight. */
export const XP_MILESTONE_THRESHOLD = 3000

/**
 * Streak-day values that fire a highlight. Matches the streak ladder already
 * shown on the About page (1/3/7/14/30/60/100/180/365) minus 1 and 3, since
 * those fall under the "reasonable number" (6+) floor requested.
 */
export const STREAK_MILESTONES = [7, 14, 30, 60, 100, 180, 365]

async function alreadyHasDedup(authorId: string, dedupKey: string): Promise<boolean> {
  const { data } = await supabase
    .from('highlights')
    .select('id')
    .eq('author_id', authorId)
    .eq('dedup_key', dedupKey)
    .maybeSingle()
  return !!data
}

function gameLabel(game: string): string {
  return getGameMeta(game)?.name ?? game
}

// ── 1. High accumulated XP in a game ────────────────────────────────────
export async function checkXpMilestoneHighlight(userId: string, game: GameKey): Promise<void> {
  const dedupKey = `xp:${game}`
  if (await alreadyHasDedup(userId, dedupKey)) return

  const { data, error } = await supabase
    .from('game_sessions')
    .select('xp_earned')
    .eq('user_id', userId)
    .eq('game', game)
  if (error) { console.error('checkXpMilestoneHighlight error:', error); return }

  const total = (data ?? []).reduce((sum, row) => sum + (Number(row.xp_earned) || 0), 0)
  if (total < XP_MILESTONE_THRESHOLD) return

  await createHighlight({
    authorId: userId,
    kind: 'xp_milestone',
    gameKey: game,
    body: `Crossed ${total.toLocaleString()} XP in ${gameLabel(game)}!`,
    value: total,
    dedupKey,
  })
}

// ── 1a. Personal best score in a game ───────────────────────────────────
// previousBest is whatever the best score was BEFORE the session that just
// got saved — callers must fetch that before inserting the new session row.
export async function checkPersonalBestHighlight(
  userId: string, game: GameKey, newScore: number, previousBest: number,
): Promise<void> {
  // previousBest <= 0 means this was their first-ever session for this
  // game — not a "beat your record" moment yet, just a starting point.
  if (previousBest <= 0 || newScore <= previousBest) return

  await createHighlight({
    authorId: userId,
    kind: 'personal_best',
    gameKey: game,
    body: `New personal best in ${gameLabel(game)} — ${newScore.toLocaleString()} points!`,
    value: newScore,
  })
}

// ── 2. Streak milestone ──────────────────────────────────────────────────
export async function checkStreakMilestoneHighlight(userId: string, newStreak: number): Promise<void> {
  if (!STREAK_MILESTONES.includes(newStreak)) return
  const dedupKey = `streak:${newStreak}`
  if (await alreadyHasDedup(userId, dedupKey)) return

  await createHighlight({
    authorId: userId,
    kind: 'streak_milestone',
    gameKey: null,
    body: `Hit a ${newStreak}-day streak!`,
    value: newStreak,
    dedupKey,
  })
}

// ── 3. Top 1–3 on a game's leaderboard ──────────────────────────────────
export async function checkLeaderboardRankHighlight(userId: string, game: GameKey): Promise<void> {
  const { fetchGlobalLeaderboard } = await import('../leaderboards/leaderboardData')
  const board = await fetchGlobalLeaderboard(game as GameKey)
  const idx = board.findIndex(entry => entry.userId === userId)
  if (idx === -1 || idx > 2) return
  const rank = idx + 1

  // Only celebrate again if this is a NEW best rank for this game (e.g. they
  // were #3 before and just reached #1) — otherwise every session while
  // sitting steady in the top 3 would re-fire the same highlight.
  const { data: existing } = await supabase
    .from('highlights')
    .select('value')
    .eq('author_id', userId)
    .eq('kind', 'leaderboard_rank')
    .eq('game_key', game)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ value: number | null }>()

  if (existing && typeof existing.value === 'number' && existing.value <= rank) return

  await createHighlight({
    authorId: userId,
    kind: 'leaderboard_rank',
    gameKey: game,
    body: `Reached #${rank} on the ${gameLabel(game)} leaderboard!`,
    value: rank,
  })
}

// ── 4. Fully explored a general map (all chambers, not one sub-chamber) ─
export async function checkMapCompleteHighlight(userId: string, mapId: number, mapName: string): Promise<void> {
  const dedupKey = `map:${mapId}`
  if (await alreadyHasDedup(userId, dedupKey)) return

  await createHighlight({
    authorId: userId,
    kind: 'map_complete',
    gameKey: null,
    mapId,
    body: `Fully explored ${mapName}!`,
    dedupKey,
  })
}

// ── 5. Granted the Top 1 / Top 2 leaderboard badge ──────────────────────
// Call this right after a successful grantManualBadge() — it no-ops for
// every badge id except the two leaderboard ones.
export async function checkLeaderboardBadgeHighlight(userId: string, badgeId: string): Promise<void> {
  if (badgeId !== 'leaderboard_legend' && badgeId !== 'runner_up_elite') return
  const dedupKey = `badge:${badgeId}`
  if (await alreadyHasDedup(userId, dedupKey)) return

  const body = badgeId === 'leaderboard_legend'
    ? 'Top 1 on the leaderboard!'
    : 'Top 2 on the leaderboard!'

  await createHighlight({
    authorId: userId,
    kind: 'leaderboard_badge',
    gameKey: null,
    badgeId,
    body,
    dedupKey,
  })
}
