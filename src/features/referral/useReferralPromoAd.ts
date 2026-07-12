// src/features/referral/useReferralPromoAd.ts
//
// Pops the "refer a friend" advert every 4 hours, but only for players who
// have never once visited the referral page. As soon as they visit it
// (Referral.tsx marks this server-side), the advert stops for good.
//
// Previously kept separate from a usePromoNotifications hook that had other
// promo checks (including a buggy, never-fixed premium check) wired to it.
// That hook was dead code — never mounted anywhere — and was deleted rather
// than fixed, since nothing depended on it. If a similar "other promo"
// system is needed later, build it fresh rather than reviving that file.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hasVisitedReferralPage } from './referral'
import type { PromoNotification } from '../notifications/PromoOverlay'

const COOLDOWN_KEY_PREFIX = 'cv_referral_ad_seen_'
const COOLDOWN_HOURS = 4

function getLastSeen(userId: string): number {
  const raw = localStorage.getItem(`${COOLDOWN_KEY_PREFIX}${userId}`)
  return raw ? parseInt(raw, 10) : 0
}

function markSeen(userId: string) {
  localStorage.setItem(`${COOLDOWN_KEY_PREFIX}${userId}`, Date.now().toString())
}

function hoursSince(timestamp: number): number {
  if (!timestamp) return Infinity
  return (Date.now() - timestamp) / (1000 * 60 * 60)
}

export function useReferralPromoAd(userId: string | null) {
  const navigate = useNavigate()
  const [active, setActive] = useState<PromoNotification | null>(null)

  useEffect(() => {
    if (!userId) return
    const uid: string = userId
    let cancelled = false

    async function check() {
      const visited = await hasVisitedReferralPage(uid)
      if (cancelled || visited) return

      if (hoursSince(getLastSeen(uid)) < COOLDOWN_HOURS) return

      setActive({
        id: 'referral_never_visited',
        imageUrl: 'https://gnobzfxtxrtcxfhhfjni.supabase.co/storage/v1/object/public/Adverts/Pics/file_000000000f2c71f4b5f22c29bcd8508b.png',
        title: 'Free diamonds are waiting on you 💎',
        bodyBefore: 'Every friend you bring in earns you both ',
        bodyHighlight: 'diamonds',
        bodyAfter: ' — up to 200 total. They\u2019re not going to invite themselves.',
        badgeText: 'NEW',
        ctaLabel: 'Take me there',
        dismissLabel: 'Close',
        onCta: () => navigate('/referral'),
      })
    }

    check()
    const t = setInterval(check, 15 * 60_000) // re-check every 15 min so long sessions still get it at the 4hr mark
    return () => { cancelled = true; clearInterval(t) }
  }, [userId, navigate])

  function dismiss() {
    if (active && userId) markSeen(userId)
    setActive(null)
  }

  return { active, dismiss }
}
