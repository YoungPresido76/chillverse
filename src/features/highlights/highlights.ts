// src/features/highlights/highlights.ts
import { supabase } from '../../shared/lib/supabase'
import type { Highlight, HighlightKind } from './types'
import { HIGHLIGHT_LIFETIME_DAYS } from './types'

function cutoffIso(): string {
  const d = new Date()
  d.setDate(d.getDate() - HIGHLIGHT_LIFETIME_DAYS)
  return d.toISOString()
}

// ── Fetch ─────────────────────────────────────────────────────
// "Delete after 5 days" is enforced here via a created_at filter, not a
// hard delete — cheap for v1, can be swapped for a real cleanup job later
// (same pattern as supabase/functions/cleanup-rooms) if the table grows large.
export async function fetchHighlights(userId: string | null, limit = 40): Promise<Highlight[]> {
  const { data: rows, error } = await supabase
    .from('highlights')
    .select('*')
    .gte('created_at', cutoffIso())
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !rows) {
    console.error('fetchHighlights error:', error)
    return []
  }

  const authorIds = [...new Set(rows.map(r => r.author_id).filter(Boolean))] as string[]
  const authorsById = new Map<string, { id: string; username: string; display_name: string | null; avatar: string }>()

  if (authorIds.length > 0) {
    const { data: authors } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar')
      .in('id', authorIds)
    for (const a of authors ?? []) authorsById.set(a.id, a)
  }

  let likedIds = new Set<string>()
  if (userId) {
    const { data: likes } = await supabase
      .from('highlight_likes')
      .select('highlight_id')
      .eq('user_id', userId)
      .in('highlight_id', rows.map(r => r.id))
    likedIds = new Set((likes ?? []).map(l => l.highlight_id))
  }

  return rows.map(r => ({
    ...r,
    author: r.author_id ? authorsById.get(r.author_id) : undefined,
    liked_by_me: likedIds.has(r.id),
  })) as Highlight[]
}

/** Small preview set for the strip shown at the top of the Feed page. */
export async function fetchHighlightsPreview(userId: string | null, limit = 8): Promise<Highlight[]> {
  return fetchHighlights(userId, limit)
}

// ── Create ────────────────────────────────────────────────────
export async function createHighlight(input: {
  authorId: string
  kind: HighlightKind
  gameKey: string | null
  body: string
}) {
  const { data, error } = await supabase
    .from('highlights')
    .insert({
      author_id: input.authorId,
      kind: input.kind,
      game_key: input.gameKey,
      body: input.body,
    })
    .select()
    .single()

  if (error) {
    console.error('createHighlight error:', error)
    return { data, error }
  }

  notifyFollowersOfHighlight(input.authorId, data.id).catch(e =>
    console.error('notifyFollowersOfHighlight error:', e)
  )

  return { data, error }
}

// ── Notifications ─────────────────────────────────────────────
// Same insert_notification RPC contract used everywhere else (posts.ts,
// achievements.ts) — shows as a live dropdown toast via Realtime and is
// saved to the notifications table for later, per the 📷 icon spec.
async function notifyFollowersOfHighlight(authorId: string, highlightId: string) {
  const { data: author } = await supabase
    .from('profiles').select('display_name, username').eq('id', authorId).single()
  if (!author) return
  const name = author.display_name || author.username

  const { data: followers } = await supabase.from('follows').select('follower_id').eq('following_id', authorId)
  if (!followers?.length) return

  for (const { follower_id } of followers) {
    await supabase.rpc('insert_notification', {
      p_user_id: follower_id,
      p_type:    'highlight_posted',
      p_title:   `${name} posted a highlight`,
      p_body:    'Tap to check it out.',
      p_icon:    'camera',
      p_meta:    { highlight_id: highlightId, author_id: authorId },
    })
  }
}

// ── Likes (toggle) ───────────────────────────────────────────
export async function toggleHighlightLike(highlightId: string, userId: string, currentlyLiked: boolean) {
  if (currentlyLiked) {
    const { error } = await supabase.from('highlight_likes').delete().eq('highlight_id', highlightId).eq('user_id', userId)
    return !error
  }
  const { error } = await supabase.from('highlight_likes').insert({ highlight_id: highlightId, user_id: userId })
  return !error
}
