// src/features/posts/posts.ts
import { supabase } from '../../shared/lib/supabase'
import type { Post, Comment, PostTag, PostingEligibility } from './types'

// ── Feed ──────────────────────────────────────────────────────
// Sorted by influence first (the whole point of the metric), then recency.
export async function fetchFeed(userId: string | null, limit = 30): Promise<Post[]> {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .order('influence', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !posts) {
    console.error('fetchFeed error:', error)
    return []
  }

  const authorIds = [...new Set(posts.map(p => p.author_id).filter(Boolean))] as string[]
  const authorsById = new Map<string, { id: string; username: string; display_name: string | null; avatar: string }>()

  if (authorIds.length > 0) {
    const { data: authors } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar')
      .in('id', authorIds)
    for (const a of authors ?? []) authorsById.set(a.id, a)
  }

  let likedPostIds = new Set<string>()
  if (userId) {
    const { data: likes } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', posts.map(p => p.id))
    likedPostIds = new Set((likes ?? []).map(l => l.post_id))
  }

  return posts.map(p => ({
    ...p,
    author: p.author_id ? authorsById.get(p.author_id) : undefined,
    liked_by_me: likedPostIds.has(p.id),
  })) as Post[]
}

// ── Create ────────────────────────────────────────────────────
export async function createPost(input: {
  authorId: string
  body: string
  tags: PostTag[]
  commentable: boolean
}) {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: input.authorId,
      author_type: 'user',
      body: input.body,
      tags: input.tags,
      commentable: input.commentable,
    })
    .select()
    .single()

  if (error) console.error('createPost error:', error)
  return { data, error }
}

// ── Likes (toggle) ───────────────────────────────────────────
export async function toggleLike(postId: string, userId: string, currentlyLiked: boolean) {
  if (currentlyLiked) {
    const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId)
    if (error) console.error('unlike error:', error)
    return !error
  }
  const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: userId })
  if (error) console.error('like error:', error)
  return !error
}

// ── Comments ──────────────────────────────────────────────────
export async function fetchComments(postId: string): Promise<Comment[]> {
  const { data: comments, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error || !comments) {
    console.error('fetchComments error:', error)
    return []
  }

  const authorIds = [...new Set(comments.map(c => c.author_id))]
  const { data: authors } = authorIds.length
    ? await supabase.from('profiles').select('id, username, display_name, avatar').in('id', authorIds)
    : { data: [] as { id: string; username: string; display_name: string | null; avatar: string }[] }

  const authorsById = new Map((authors ?? []).map(a => [a.id, a]))
  return comments.map(c => ({ ...c, author: authorsById.get(c.author_id) })) as Comment[]
}

export async function addComment(postId: string, authorId: string, body: string) {
  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, author_id: authorId, body })
    .select()
    .single()

  if (error) console.error('addComment error:', error)
  return { data, error }
}

// ── Posting eligibility (server-checked, see migration 0007) ───
export async function checkPostingEligibility(userId: string): Promise<PostingEligibility | null> {
  const { data, error } = await supabase
    .rpc('check_posting_eligibility', { p_user_id: userId })
    .maybeSingle<PostingEligibility>()

  if (error) {
    console.error('checkPostingEligibility error:', error)
    return null
  }
  return data ?? null
}
