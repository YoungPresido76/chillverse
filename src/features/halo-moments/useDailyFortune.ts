// src/features/halo-moments/useDailyFortune.ts
//
// Fetches the daily fortune once per mounted app session and exposes it for
// DailyFortuneSheet to display. No localStorage cooldown needed — the
// idempotency lives server-side in get_or_create_daily_fortune() (migration
// 0065), so a reload simply re-fetches the same fortune for today rather
// than generating a new one. `fetchedRef` just stops it from re-fetching on
// every re-render of whatever mounts this hook.

import { useEffect, useRef, useState } from 'react'
import { getOrCreateDailyFortune, type DailyFortune } from './haloMoments'

export function useDailyFortune(userId: string | null) {
  const [fortune, setFortune] = useState<DailyFortune | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!userId || fetchedRef.current) return
    fetchedRef.current = true
    getOrCreateDailyFortune().then(f => { if (f) setFortune(f) })
  }, [userId])

  function dismiss() {
    setDismissed(true)
  }

  return { fortune: dismissed ? null : fortune, dismiss }
}
