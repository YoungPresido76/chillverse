// src/features/posts/useAnnouncements.ts
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../shared/lib/supabase'
import { useAuth } from '../auth/useAuth'
import { fetchAnnouncements } from './staffPosts'
import type { Post } from './types'

interface UseAnnouncementsState {
  posts: Post[]
  loading: boolean
  refetch: () => void
  removePostLocally: (postId: string) => void
}

/** Mirrors useFeed.ts but scoped to staff posts (author_type admin/system)
 *  for the Announcements tab — kept separate rather than parameterizing
 *  useFeed, since the two have different sort orders (pinned+recency here
 *  vs. influence there) and will likely diverge further (e.g. read
 *  receipts on announcements) as staff tooling grows. */
export function useAnnouncements(): UseAnnouncementsState {
  const { user } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])
  const removePostLocally = useCallback((postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId))
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchAnnouncements(user?.id ?? null).then(data => {
      if (active) {
        setPosts(data)
        setLoading(false)
      }
    })
    return () => { active = false }
  }, [user?.id, tick])

  useEffect(() => {
    const channel = supabase
      .channel('posts-announcements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => refetch())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [refetch])

  return { posts, loading, refetch, removePostLocally }
}
