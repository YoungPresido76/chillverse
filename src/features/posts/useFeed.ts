// src/features/posts/useFeed.ts
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../shared/lib/supabase'
import { useAuth } from '../auth/useAuth'
import { fetchFeed } from './posts'
import type { Post } from './types'

interface UseFeedState {
  posts: Post[]
  loading: boolean
  refetch: () => void
  removePostLocally: (postId: string) => void
}

export function useFeed(): UseFeedState {
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
    fetchFeed(user?.id ?? null).then(data => {
      if (active) {
        setPosts(data)
        setLoading(false)
      }
    })
    return () => { active = false }
  }, [user?.id, tick])

  // Realtime: new posts, and influence/like/comment count changes on existing ones.
  useEffect(() => {
    const channel = supabase
      .channel('posts-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => refetch())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [refetch])

  return { posts, loading, refetch, removePostLocally }
}
