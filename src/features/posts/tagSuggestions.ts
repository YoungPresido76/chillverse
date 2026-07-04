// src/features/posts/tagSuggestions.ts
import { supabase } from '../../shared/lib/supabase'
import { getAllAchievements, getPlayerAchievements } from '../achievements/achievements'
import { getUserRankTier } from '../profile/ranks'
import { getAllArtifacts, getPlayerArtifacts } from '../economy/artifacts'
import { GAMES } from '../games/games'
import type { TagSuggestion } from './types'

const matches = (label: string, query: string) => label.toLowerCase().includes(query.toLowerCase())

// GAMES entries use a hyphenated `id` (routing key) and an underscored `dbKey`
// (what's actually stored in game_sessions.game). Build a quick lookup both ways.
const gameByDbKey = new Map<string, (typeof GAMES)[number]>(GAMES.map(g => [g.dbKey, g]))
const gameById = new Map<string, (typeof GAMES)[number]>(GAMES.map(g => [g.id, g]))

/**
 * Builds the typed-match suggestion list for the composer's tag box.
 * Each source is a best-effort fetch — if one fails, the others still return.
 * `query` may be empty (used to show the full recent/available pool before typing).
 */
export async function getTagSuggestions(userId: string, query: string): Promise<TagSuggestion[]> {
  const q = query.trim()
  const results: TagSuggestion[] = []

  const [profileRes, unlockedAch, allAch, artifacts, playerArtifacts, inventory, missions] =
    await Promise.all([
      supabase.from('profiles').select('xp, streak, avatar').eq('id', userId).single(),
      getPlayerAchievements(userId).catch(() => []),
      getAllAchievements().catch(() => []),
      getAllArtifacts().catch(() => []),
      getPlayerArtifacts(userId).catch(() => []),
      supabase.from('user_inventory').select('item_id, is_equipped, mall_items(name)').eq('user_id', userId).eq('is_equipped', true),
      supabase.from('user_weekly_missions').select('mission_id, completed_at').eq('user_id', userId).not('completed_at', 'is', null),
    ])

  // Rank
  const profile = profileRes.data
  if (profile) {
    const tier = getUserRankTier(profile.xp ?? 0)
    if (matches(tier.name, q)) {
      results.push({ type: 'rank', ref_id: tier.id, label: `Rank: ${tier.name}` })
    }
    if (matches('streak', q) && (profile.streak ?? 0) > 0) {
      results.push({ type: 'streak', ref_id: 'streak', label: `${profile.streak}-day streak` })
    }
    if (matches('avatar', q) || matches('profile pic', q)) {
      results.push({ type: 'avatar', ref_id: userId, label: 'My avatar' })
    }
  }

  // Achievements (unlocked only)
  const unlockedIds = new Set(unlockedAch.map(a => a.achievement_id))
  for (const ach of allAch) {
    if (unlockedIds.has(ach.id) && matches(ach.title, q)) {
      results.push({ type: 'achievement', ref_id: ach.id, label: ach.title })
    }
  }

  // Artifacts (unlocked only)
  const unlockedArtifactIds = new Set(playerArtifacts.map(a => a.artifact_id))
  for (const art of artifacts) {
    if (unlockedArtifactIds.has(art.id) && matches(art.name, q)) {
      results.push({ type: 'artifact', ref_id: art.id, label: art.name })
    }
  }

  // Equipped mall items
  for (const row of inventory.data ?? []) {
    const item = (row as unknown as { mall_items?: { name: string } }).mall_items
    if (item?.name && matches(item.name, q)) {
      results.push({ type: 'mall_item', ref_id: row.item_id, label: item.name })
    }
  }

  // Completed missions
  for (const m of missions.data ?? []) {
    if (matches(m.mission_id, q)) {
      results.push({ type: 'mission', ref_id: m.mission_id, label: `Mission: ${m.mission_id}` })
    }
  }

  // Recent game results (last 5 completed sessions) — carries the real game
  // name + its routable id so the tag is clickable straight into that game.
  if (q.length >= 2) {
    const { data: sessions } = await supabase
      .from('game_sessions')
      .select('id, game, score')
      .eq('user_id', userId)
      .eq('result', 'completed')
      .order('created_at', { ascending: false })
      .limit(5)
    for (const s of sessions ?? []) {
      const meta = gameByDbKey.get(s.game)
      const gameName = meta?.name ?? s.game.replace(/_/g, ' ')
      const label = `${gameName} · Score ${s.score}`
      if (matches(label, q)) {
        results.push({ type: 'game_result', ref_id: s.id, label, meta: meta ? { gameId: meta.id } : undefined })
      }
    }
  }

  // Recent multiplayer rooms
  if (q.length >= 2) {
    const { data: rooms } = await supabase
      .from('room_players')
      .select('room_id, rooms(id, game_id, code)')
      .eq('user_id', userId)
      .order('room_id', { ascending: false })
      .limit(5)
    for (const r of rooms ?? []) {
      const room = (r as unknown as { rooms?: { id: string; game_id: string | null; code: string } }).rooms
      if (!room?.game_id) continue
      const meta = gameById.get(room.game_id)
      const gameName = meta?.name ?? room.game_id.replace(/-/g, ' ')
      const label = `Multiplayer: ${gameName} (#${room.code})`
      if (matches(label, q)) {
        results.push({ type: 'multiplayer_result', ref_id: room.id, label, meta: { gameId: room.game_id } })
      }
    }
  }

  // @mention — followers only (people who follow this user), per product decision.
  if (q.length >= 2) {
    const { data: followRows } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', userId)
      .limit(200)
    const followerIds = (followRows ?? []).map(f => f.follower_id)
    if (followerIds.length > 0) {
      const { data: followerProfiles } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .in('id', followerIds)
        .ilike('username', `%${q}%`)
        .limit(10)
      for (const u of followerProfiles ?? []) {
        results.push({ type: 'user', ref_id: u.id, label: `@${u.username}` })
      }
    }
  }

  return results.slice(0, 20)
}
