// src/shared/lib/proPlans.ts
// Central config for Chillverse Premium (Orbit / Void). Plan codes come
// from the Paystack dashboard (Payments → Plans) — update PLAN_CODES if
// you ever recreate a plan there, since the code changes.

export type ProTier = 'orbit' | 'void'
export type BillingInterval = 'monthly' | 'yearly'

export interface ProPlanOption {
  tier: ProTier
  interval: BillingInterval
  planCode: string
  amountKobo: number      // Paystack amount in kobo (NGN × 100)
  priceDisplay: string    // "₦3,500"
}

export const PLAN_CODES: Record<ProTier, Record<BillingInterval, ProPlanOption>> = {
  orbit: {
    monthly: { tier: 'orbit', interval: 'monthly', planCode: 'PLN_9jnq69avo1tr60t', amountKobo: 350_000,  priceDisplay: '₦3,500' },
    yearly:  { tier: 'orbit', interval: 'yearly',  planCode: 'PLN_iqt6skasttaqc79', amountKobo: 3_500_000, priceDisplay: '₦35,000' },
  },
  void: {
    monthly: { tier: 'void', interval: 'monthly', planCode: 'PLN_aaz0myfn9x3s819', amountKobo: 750_000,  priceDisplay: '₦7,500' },
    yearly:  { tier: 'void', interval: 'yearly',  planCode: 'PLN_9bhvy7t70adfro9', amountKobo: 7_500_000, priceDisplay: '₦75,000' },
  },
}

export interface ProTierInfo {
  tier: 'free' | ProTier
  name: string
  tagline: string
  color: string
  glow: string
  monthlyDisplay: string   // what's shown next to the toggle price, always monthly-equivalent
  yearlyEquivDisplay?: string // "≈ ₦2,917/mo billed yearly"
  badge?: string
  features: string[]
}

export const TIERS: ProTierInfo[] = [
  {
    tier: 'free',
    name: 'Free',
    tagline: 'The basic Chillverse experience',
    color: 'var(--text-dim)',
    glow: 'rgba(255,255,255,0.08)',
    monthlyDisplay: '₦0',
    features: [
      'Exploration & Artifacts',
      'Basic Halo AI model',
      'Free sessions, daily auto-renewal',
      'Version 1.0',
      'Basic games',
    ],
  },
  {
    tier: 'orbit',
    name: 'Orbit',
    tagline: 'For players who want more room to play',
    color: 'var(--blue)',
    glow: 'rgba(79,142,247,0.35)',
    monthlyDisplay: '₦3,500',
    yearlyEquivDisplay: '≈ ₦2,917/mo billed yearly',
    badge: 'POPULAR',
    features: [
      'Everything in Free',
      '19 sessions a day (up from 15 on Free)',
      'Version 2.0 – 4.0 unlocked',
      'More games',
      'Exclusive Orbit tag on your profile',
    ],
  },
  {
    tier: 'void',
    name: 'Void',
    tagline: 'Full access, no limits worth mentioning',
    color: 'var(--purple)',
    glow: 'rgba(155,109,255,0.4)',
    monthlyDisplay: '₦7,500',
    yearlyEquivDisplay: '≈ ₦6,250/mo billed yearly',
    badge: 'BEST VALUE',
    features: [
      'Everything in Free + Orbit',
      '25 sessions a day (up from 19 on Orbit)',
      'Exclusive Void tag + profile pic added to your inventory',
    ],
  },
]

// NOTE: the numbers above are real daily session counts (see
// getSessionLimits below), not multipliers — a previous version of this
// copy claimed "10×" (Orbit) and "20×+" (Void) more sessions, which never
// matched the actual 15 → 19 → 25/day figures. "Social Island" and a
// Void-exclusive "live session-limit tracker" were also advertised here
// at one point; neither was ever built (the session counter in Games.tsx
// is shown to every tier, not just Void), so both were removed rather than
// left as unfulfilled promises. Reintroduce them here only once they
// actually exist.

// ── Shared "is this user's Pro plan currently active" check ──────
// Single source of truth so Games.tsx, Version.tsx, Mall.tsx, Profile.tsx,
// Settings.tsx, Artifacts.tsx etc. all agree on what "Pro" means (is_pro
// flag AND not expired).
export function isProActive(
  profile: { is_pro?: boolean | null; pro_expires_at?: string | null } | null | undefined,
): boolean {
  if (!profile?.is_pro) return false
  if (!profile.pro_expires_at) return true
  return new Date(profile.pro_expires_at) > new Date()
}

// ── Daily session allowance + cooldown by tier ────────────────────
// Free: 15 sessions/day, 4.5h cooldown once burned out.
// Orbit: 19 sessions/day, 3.5h cooldown.
// Void:  25 sessions/day, 3.5h cooldown.
export interface SessionLimitConfig {
  limit: number
  cooldownHours: number
}

export function getSessionLimits(
  profile: { is_pro?: boolean | null; pro_tier?: ProTier | string | null; pro_expires_at?: string | null } | null | undefined,
): SessionLimitConfig {
  if (!isProActive(profile)) return { limit: 15, cooldownHours: 4.5 }
  if (profile?.pro_tier === 'void') return { limit: 25, cooldownHours: 3.5 }
  return { limit: 19, cooldownHours: 3.5 } // orbit (also the safe default for any active-but-unrecognized tier)
}

export function getYearlySavingsPct(tier: ProTier): number {
  const m = PLAN_CODES[tier].monthly.amountKobo * 12
  const y = PLAN_CODES[tier].yearly.amountKobo
  return Math.round(((m - y) / m) * 100)
}
