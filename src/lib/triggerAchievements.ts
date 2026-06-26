// src/lib/triggerAchievements.ts
//
// Central helper that gathers all data required by checkAndUnlockAchievements
// and fires it. Call this after any action that could unlock achievements:
//   - after a game session ends (in Games.tsx handleResult)
//   - after login / app mount (for streak, social, profile achievements)
//   - after following someone (social achievements)
//   - after sending a message (social_first_msg)

import { supabase } from './supabase'
import { checkAndUnlockAchievements } from './achievements'

// Earliest date considered an "early adopter" — adjust as needed
const EARLY_ADOPTER_CUTOFF = new Date('2025-12-31T23:59:59Z')

export async function triggerAchievementCheck(userId: string): Promise<void> {
  try {
    // ── 1. Profile (xp, level, streak, created_at, profile completeness) ──
    const { data: profile } = await supabase
      .from('profiles')
      .select('xp, level, streak, created_at, username, display_name, avatar, country, dob, interests, connected_platform')
      .eq('id', userId)
      .single()

    if (!profile) return

    const xp      = profile.xp     ?? 0
    const level   = profile.level  ?? 1
    const streak  = profile.streak ?? 0

    // Profile is "complete" if they have set display_name, country, dob, and at least 1 interest
    const profileComplete =
      !!profile.display_name &&
      !!profile.country &&
      !!profile.dob &&
      Array.isArray(profile.interests) && profile.interests.length > 0

    const joinedEarly = profile.created_at
      ? new Date(profile.created_at) <= EARLY_ADOPTER_CUTOFF
      : false

    // ── 2. Game sessions (total count, games played set, top score) ──
    const { data: sessions } = await supabase
      .from('game_sessions')
      .select('game, score, played_at')
      .eq('user_id', userId)

    const allSessions = sessions ?? []
    const totalSessions = allSessions.length
    const gamesPlayedSet = new Set(allSessions.map(s => s.game as string))
    const topScore = allSessions.reduce((max, s) => Math.max(max, s.score ?? 0), 0)

    // Check if any session happened between midnight and 4am (night owl)
    const playedAfterMidnight = allSessions.some(s => {
      if (!s.played_at) return false
      const h = new Date(s.played_at).getHours()
      return h >= 0 && h < 4
    })

    // ── 3. Game ranks ──
    const { data: rankRows } = await supabase
      .from('player_game_ranks')
      .select('game, rank')
      .eq('user_id', userId)

    const gameRanks: Record<string, string> = {}
    for (const row of rankRows ?? []) {
      gameRanks[row.game] = row.rank
    }

    // ── 4. Social counts ──
    const { data: followCounts } = await supabase
      .from('profile_follow_counts')
      .select('followers_count, following_count')
      .eq('id', userId)
      .maybeSingle()

    const followerCount  = Number(followCounts?.followers_count  ?? 0)
    const followingCount = Number(followCounts?.following_count  ?? 0)

    // ── 5. Messages sent ──
    const { count: messagesSentCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    const messagesSent = messagesSentCount ?? 0

    // DM = any message sent in a non-global room
    const { count: dmCount } = await supabase
      .from('messages')
      .select('*, chat_rooms!inner(type)', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('chat_rooms.type', 'dm')

    const dmSent = (dmCount ?? 0) > 0

    // ── 6. Special: speed run + perfect score ──
    // speed run = any session completed in ≤ 30s with score > 0
    const completedIn30Sec = allSessions.some(s => {
      const dur = (s as unknown as { duration_sec?: number }).duration_sec
      return typeof dur === 'number' && dur <= 30 && (s.score ?? 0) > 0
    })

    // perfect score = a session where score hit ≥ 100 (adjust threshold if needed)
    const perfectScore = topScore >= 100

    // ── 7. Fire the check ──
    await checkAndUnlockAchievements({
      userId,
      xp,
      level,
      streak,
      totalSessions,
      gamesPlayed: gamesPlayedSet,
      topScore,
      gameRanks,
      followingCount,
      followerCount,
      messagesSent,
      dmSent,
      profileComplete,
      joinedEarly,
      playedAfterMidnight,
      completedIn30Sec,
      perfectScore,
    })
  } catch (err) {
    // Non-critical — never let achievement errors bubble up and break the app
    console.error('[triggerAchievements] error:', err)
  }
}
