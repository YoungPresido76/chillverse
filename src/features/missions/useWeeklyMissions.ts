// src/hooks/useWeeklyMissions.ts
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../auth/useAuth'
import {
  getOrCreateWeeklyMissions,
  getTimeUntilReset,
} from './weeklyMissions'
import type { MissionWithProgress } from './weeklyMissions'

interface WeeklyMissionsState {
  missions: MissionWithProgress[]
  loading: boolean
  weekProgress: number
  totalXpEarned: number
  totalDiamondsEarned: number
  boostersEarned: number
  countdown: { days: number; hours: number; minutes: number }
  refresh: () => void
}

export function useWeeklyMissions(): WeeklyMissionsState {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [missions, setMissions] = useState<MissionWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [totalXpEarned, setTotalXpEarned] = useState(0)
  const [totalDiamondsEarned, setTotalDiamondsEarned] = useState(0)
  const [boostersEarned, setBoostersEarned] = useState(0)
  const [countdown, setCountdown] = useState(getTimeUntilReset())

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const result = await getOrCreateWeeklyMissions(userId)
      setMissions(result)

      // Derive totals from the missions returned — the row totals are sourced
      // from user_weekly_missions; we re-fetch via a separate query to stay in sync.
      // For now compute from the completed set to avoid an extra round-trip.
      let xp = 0
      let diamonds = 0
      let boosters = 0
      for (const m of result) {
        if (m.is_completed) {
          xp += m.xp_reward
          diamonds += m.diamond_reward
          if (m.reward_type === 'xp_and_booster') boosters += 1
        }
      }
      setTotalXpEarned(xp)
      setTotalDiamondsEarned(diamonds)
      setBoostersEarned(boosters)
    } catch (err) {
      console.error('[useWeeklyMissions] load error:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Load on mount and when userId changes
  useEffect(() => {
    load()
  }, [load])

  // Countdown ticker — updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getTimeUntilReset())
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  const weekProgress = missions.filter(m => m.is_completed).length

  return {
    missions,
    loading,
    weekProgress,
    totalXpEarned,
    totalDiamondsEarned,
    boostersEarned,
    countdown,
    refresh: load,
  }
}
