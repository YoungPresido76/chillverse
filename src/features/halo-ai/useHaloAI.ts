// src/features/halo-ai/useHaloAI.ts
import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../../shared/lib/supabase'
import { useProfile } from '../profile/useProfile'
import { updateMissionProgress, trackWeeklyActiveDay } from '../missions/weeklyMissions'

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
  messagesLeft: number
  isIncreasedTier: boolean // true if this player is on the higher daily-limit tier
  sendMessage: (text: string) => Promise<void>
  clearError: () => void
  addLocalMessage: (msg: HaloMessage) => void
}

// Keep these two in sync with supabase/functions/halo-ai-chat/index.ts —
// BASE_DAILY_LIMIT / INCREASED_DAILY_LIMIT / INCREASED_TIER_VERSION.
// Deliberately never printed as raw numbers in the UI (HaloAI.tsx) — only
// used here to compute an accurate "N left today" countdown.
const BASE_DAILY_LIMIT = 5
const INCREASED_DAILY_LIMIT = 10
const INCREASED_TIER_VERSION = 2

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function useHaloAI(): UseHaloAIReturn {
  const { profile } = useProfile()
  const [messages, setMessages] = useState<HaloMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)

  const isIncreasedTier = (profile?.version_level ?? 0) >= INCREASED_TIER_VERSION
  const dailyLimit = isIncreasedTier ? INCREASED_DAILY_LIMIT : BASE_DAILY_LIMIT

  // Fetch today's usage once on mount / when the player changes, so the
  // countdown is accurate before the player sends their first message of
  // the session (not just after a response comes back).
  useEffect(() => {
    if (!profile?.id) return
    let cancelled = false

    supabase
      .from('halo_ai_usage')
      .select('question_count')
      .eq('player_id', profile.id)
      .eq('usage_date', todayStr())
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setRemaining(Math.max(0, dailyLimit - (data?.question_count ?? 0)))
      })

    return () => { cancelled = true }
  }, [profile?.id, dailyLimit])

  const messagesLeft = remaining ?? dailyLimit

  const clearError = useCallback(() => setError(null), [])

  const addLocalMessage = useCallback((msg: HaloMessage) => {
    setMessages(prev => [...prev, msg])
  }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!profile || messagesLeft === 0) return

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
        if (!session?.access_token) {
          throw new Error('No active session — user may not be logged in or session expired.')
        }

        const { data, error: fnError } = await supabase.functions.invoke('halo-ai-chat', {
          body: { question: text },
        })

        if (fnError) {
          // supabase-js surfaces non-2xx responses here; the function body
          // (e.g. { error: 'limit_reached' }) isn't auto-parsed on error,
          // so fall back to a generic message unless we can tell it's the
          // limit.
          const status = (fnError as { context?: { status?: number } })?.context?.status
          if (status === 429) {
            setRemaining(0)
            setError("You've hit today's Halo AI limit — it resets in 24 hours.")
            return
          }
          throw fnError
        }

        if (!data?.answer) {
          throw new Error(`Response OK but no "answer" field present. Raw: ${JSON.stringify(data)}`)
        }

        const haloMessage: HaloMessage = {
          id: `${Date.now()}-halo`,
          role: 'halo',
          text: data.answer,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, haloMessage])

        if (typeof data.remaining === 'number') {
          setRemaining(data.remaining)
        }

        // Weekly missions
        updateMissionProgress(profile.id, 'halo_messages_sent', 1).catch(console.error)
        trackWeeklyActiveDay(profile.id, 'halo_days').catch(console.error)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[HaloAI]', msg)
        setError('Halo is having trouble responding right now. Try again in a moment.')
      } finally {
        setLoading(false)
      }
    },
    [profile, messagesLeft]
  )

  return {
    messages,
    loading,
    error,
    messagesLeft,
    isIncreasedTier,
    sendMessage,
    clearError,
    addLocalMessage,
  }
}
