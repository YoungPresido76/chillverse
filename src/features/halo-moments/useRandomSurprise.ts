// src/features/halo-moments/useRandomSurprise.ts
//
// Random Surprise Popup (plan §4.6) — purely a side-effect hook, no UI of
// its own. On a randomized 30-60min interval, while the tab is visible, it
// asks the server for a surprise. claim_random_surprise() is idempotent
// per user/UTC-day and inserts the notification itself on a real grant, so
// this hook doesn't need to render or track any content — the existing
// realtime toast pipeline (Group 1) shows it automatically.
//
// Two separate caps, matching the plan: `firedThisSessionRef` stops this
// tab from re-attempting every interval once today's grant is settled
// (session-level, resets on reload); the server-side per-day table stops
// multiple tabs/reloads from farming more than one grant a day.

import { useEffect, useRef } from 'react'
import { claimRandomSurprise } from './haloMoments'

const MIN_INTERVAL_MS = 30 * 60_000
const MAX_INTERVAL_MS = 60 * 60_000

function randomDelay(): number {
  return MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS)
}

export function useRandomSurprise(userId: string | null) {
  const settledThisSessionRef = useRef(false)

  useEffect(() => {
    if (!userId) return
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    function schedule() {
      timeoutId = setTimeout(attempt, randomDelay())
    }

    async function attempt() {
      if (cancelled) return
      if (settledThisSessionRef.current || document.visibilityState !== 'visible') {
        schedule()
        return
      }
      const result = await claimRandomSurprise()
      // Whether it was a fresh grant or "already claimed today" (another
      // tab/earlier this session), today's outcome is settled either way —
      // stop retrying until next reload. Only a request error (result ===
      // null) leaves it eligible to try again next interval.
      if (result) settledThisSessionRef.current = true
      schedule()
    }

    schedule()
    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [userId])
}
