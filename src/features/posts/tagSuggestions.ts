// src/features/posts/tagSuggestions.ts
import { supabase } from '../../shared/lib/supabase'
import { getAllAchievements, getPlayerAchievements } from '../achievements/achievements'
import { getUserRankTier } from '../profile/ranks'
import { getAllArtifacts, getPlayerArtifacts } from '../economy/artifacts'
import type { TagSuggestion } from './types'

const matches = (label: string, query: string) => label.toLowerCase().includes(query.toLowerCase())

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

  // Recent game results (last 5 completed sessions)
  if (q.length >= 2) {
    const { data: sessions } = await supabase
      .from('game_sessions')
      .select('id, game, score')
      .eq('user_id', userId)
      .eq('result', 'completed')
      .order('created_at', { ascending: false })
      .limit(5)
    for (const s of sessions ?? []) {
      const label = `${s.game.replace(/_/g, ' ')} · Score ${s.score}`
      if (matches(label, q)) results.push({ type: 'game_result', ref_id: s.id, label })
    }
  }

  // Recent multiplayer rooms
  if (q.length >= 2) {
    const { data: rooms } = await supabase
      .from('room_players')
      .select('room_id, rooms(id, game, code)')
      .eq('user_id', userId)
      .order('room_id', { ascending: false })
      .limit(5)
    for (const r of rooms ?? []) {
      const room = (r as unknown as { rooms?: { id: string; game: string; code: string } }).rooms
      if (!room) continue
      const label = `Multiplayer: ${room.game.replace(/_/g, ' ')} (#${room.code})`
      if (matches(label, q)) results.push({ type: 'multiplayer_result', ref_id: room.id, label })
    }
  }

  // @mention users
  if (q.length >= 2) {
    const { data: users } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .ilike('username', `%${q}%`)
      .limit(5)
    for (const u of users ?? []) {
      if (u.id === userId) continue
      results.push({ type: 'user', ref_id: u.id, label: `@${u.username}` })
    }
  }

  return results.slice(0, 20)
}
