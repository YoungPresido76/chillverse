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
