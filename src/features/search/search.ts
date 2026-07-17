// src/features/search/search.ts
import { supabase } from '../../shared/lib/supabase'
import { GAMES, type GameMeta } from '../games/games'
import type { MallItem } from '../../shared/types'

export interface PlayerResult {
  id: string
  username: string
  display_name: string | null
  avatar: string
}

export interface FollowSuggestion extends PlayerResult {
  /** Name of a mutual connection who already follows this person, if any. */
  followedByName: string | null
}

export async function searchPlayers(query: string): Promise<PlayerResult[]> {
  if (query.trim().length < 2) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar')
    .ilike('username', `%${query.trim()}%`)
    .limit(20)

  if (error) {
    console.error('searchPlayers error:', error)
    return []
  }
  return data ?? []
}

/** Games catalog is small and static, so we just filter it in memory. */
export function searchGames(query: string): GameMeta[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return GAMES.filter(g => g.name.toLowerCase().includes(q) || g.tagline.toLowerCase().includes(q))
}

let mallItemsCache: MallItem[] | null = null

/** Mall catalog is a small, mostly-static table — fetched once and filtered in memory. */
export async function searchMallItems(query: string): Promise<MallItem[]> {
  const q = query.trim().toLowerCase()
  if (!q) return []

  if (!mallItemsCache) {
    const { data, error } = await supabase.from('mall_items').select('*').eq('is_active', true)
    if (error) {
      console.error('searchMallItems fetch error:', error)
      return []
    }
    mallItemsCache = data ?? []
  }

  return mallItemsCache.filter(i =>
    i.name.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q)
  )
}

/**
 * "Who to follow" suggestions for a player, shown on the search page.
 *
 * Two tiers, same as most social apps:
 *  1. Second-degree connections — people followed by someone the player
 *     already follows ("Followed by Roland Yeboah"). These are the most
 *     relevant, so they're fetched and ranked first.
 *  2. Fallback — other active players the person doesn't already follow,
 *     to top the list up to `limit` when there aren't enough mutuals.
 */
export async function getFollowSuggestions(myId: string, limit = 10): Promise<FollowSuggestion[]> {
  // 1. Who I already follow (used to exclude, and as the "bridge" for tier 1).
  const { data: myFollowing } = await supabase
    .from('follows').select('following_id').eq('follower_id', myId)
  const followingIds = (myFollowing ?? []).map(f => f.following_id)
  const excludeIds = new Set([myId, ...followingIds])

  const suggestions: FollowSuggestion[] = []
  const seen = new Set<string>()

  // 2. Second-degree: people my follows follow, that I don't already follow.
  if (followingIds.length) {
    const { data: bridgeRows } = await supabase
      .from('follows')
      .select('follower_id, following_id')
      .in('follower_id', followingIds)
      .limit(200)

    const candidateIds: string[] = []
    const bridgeFor = new Map<string, string>() // candidate id -> the friend who follows them
    for (const row of bridgeRows ?? []) {
      if (excludeIds.has(row.following_id) || seen.has(row.following_id)) continue
      seen.add(row.following_id)
      candidateIds.push(row.following_id)
      bridgeFor.set(row.following_id, row.follower_id)
    }

    if (candidateIds.length) {
      const bridgeIds = [...new Set(bridgeFor.values())]
      const [{ data: candidates }, { data: bridgeProfiles }] = await Promise.all([
        supabase.from('profiles').select('id, username, display_name, avatar').in('id', candidateIds.slice(0, limit)),
        supabase.from('profiles').select('id, username, display_name').in('id', bridgeIds),
      ])
      const bridgeNameById = new Map((bridgeProfiles ?? []).map(b => [b.id, b.display_name || b.username]))
      for (const c of candidates ?? []) {
        const bridgeId = bridgeFor.get(c.id)
        suggestions.push({ ...c, followedByName: bridgeId ? bridgeNameById.get(bridgeId) ?? null : null })
      }
    }
  }

  // 3. Fallback: fill remaining slots with other players, most recently joined first.
  if (suggestions.length < limit) {
    const alreadyIncluded = new Set([...excludeIds, ...suggestions.map(s => s.id)])
    const { data: filler } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar')
      .order('created_at', { ascending: false })
      .limit(limit + alreadyIncluded.size)

    for (const p of filler ?? []) {
      if (suggestions.length >= limit) break
      if (alreadyIncluded.has(p.id)) continue
      alreadyIncluded.add(p.id)
      suggestions.push({ ...p, followedByName: null })
    }
  }

  return suggestions.slice(0, limit)
}
