// src/hooks/useHaloAI.ts
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from './useProfile'
import { getUserRankTier } from '../lib/ranks'

export interface HaloMessage {
  id: string
  role: 'user' | 'halo'
  text: string
  timestamp: Date
}

export interface UseHaloAIReturn {
  messages: HaloMessage[]
  loading: boolean
  error: string | null
  messagesLeft: number // -1 = unlimited
  dailyLimit: number   // 5 | 25 | -1
  sendMessage: (text: string) => Promise<void>
  clearError: () => void
  addLocalMessage: (msg: HaloMessage) => void
}

function getDailyLimit(versionLevel: number): number {
  if (versionLevel >= 5) return -1 // unlimited (Void)
  if (versionLevel >= 3) return 25 // Pro (v3.0 or v4.0)
  return 5 // Free
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function useHaloAI(): UseHaloAIReturn {
  const { profile, refetch } = useProfile()
  const [messages, setMessages] = useState<HaloMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dailyLimit = getDailyLimit(profile?.version_level ?? 0)

  const effectiveCount = (() => {
    if (!profile) return 0
    const isNewDay = profile.halo_last_message_date !== todayStr()
    return isNewDay ? 0 : profile.halo_messages_today ?? 0
  })()

  const messagesLeft = dailyLimit === -1 ? -1 : Math.max(0, dailyLimit - effectiveCount)

  const clearError = useCallback(() => setError(null), [])

  const addLocalMessage = useCallback((msg: HaloMessage) => {
    setMessages(prev => [...prev, msg])
  }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!profile) return
      if (messagesLeft === 0) return

      const userMessage: HaloMessage = {
        id: `${Date.now()}-user`,
        role: 'user',
        text,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, userMessage])
      setLoading(true)
      setError(null)

      try {
        const { data: { session } } = await supabase.auth.getSession()

        const rankTier = getUserRankTier(profile.xp)
        const playerContext = {
          username: profile.username,
          displayName: profile.display_name,
          xp: profile.xp,
          level: profile.level,
          streak: profile.streak,
          version_level: profile.version_level ?? 0,
          rank: rankTier.name,
        }

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/halo-ai`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ message: text, playerContext }),
          }
        )

        if (!res.ok) {
          throw new Error('Halo had trouble responding.')
        }

        const data: { reply: string } = await res.json()

        const haloMessage: HaloMessage = {
          id: `${Date.now()}-halo`,
          role: 'halo',
          text: data.reply,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, haloMessage])

        const today = todayStr()
        const isNewDay = profile.halo_last_message_date !== today
        const newCount = isNewDay ? 1 : (profile.halo_messages_today ?? 0) + 1

        await supabase
          .from('profiles')
          .update({
            halo_messages_today: newCount,
            halo_last_message_date: today,
          })
          .eq('id', profile.id)

        refetch()
      } catch (err) {
        setError('Halo had trouble responding. Try again.')
      } finally {
        setLoading(false)
      }
    },
    [profile, messagesLeft, refetch]
  )

  return {
    messages,
    loading,
    error,
    messagesLeft,
    dailyLimit,
    sendMessage,
    clearError,
    addLocalMessage,
  }
}
