// src/lib/ranks.ts

export interface RankTier {
  id: string
  name: string
  group: 'rookie' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legend' | 'og'
  xpRequired: number
  color: string
  glowColor: string
  emoji: string
  rewards: Reward[]
}

export interface Reward {
  type:
    | 'badge'
    | 'profile_pic'
    | 'album_pic'
    | 'chat_name_glow'
    | 'profile_border_glow'
    | 'mall_pick'
    | 'nothing'
  label: string
  description: string
  imageUrl?: string
  glowColor?: string
}

export const RANK_TIERS: RankTier[] = [
  // ── Rookie ──────────────────────────────────────────────────
  {
    id: 'rookie',
    name: 'Rookie',
    group: 'rookie',
    xpRequired: 0,
    color: '#888899',
    glowColor: 'rgba(136,136,153,0.35)',
    emoji: '🌱',
    rewards: [{ type: 'nothing', label: 'No rewards yet', description: 'Keep grinding — rewards start at Gold.' }],
  },

  // ── Bronze ───────────────────────────────────────────────────
  {
    id: 'bronze_1',
    name: 'Bronze I',
    group: 'bronze',
    xpRequired: 1_000,
    color: '#cd7f32',
    glowColor: 'rgba(205,127,50,0.35)',
    emoji: '🔶',
    rewards: [{ type: 'nothing', label: 'No rewards yet', description: 'Rewards begin at Gold I. Keep earning XP.' }],
  },
  {
    id: 'bronze_2',
    name: 'Bronze II',
    group: 'bronze',
    xpRequired: 2_500,
    color: '#cd7f32',
    glowColor: 'rgba(205,127,50,0.35)',
    emoji: '🔶',
    rewards: [{ type: 'nothing', label: 'No rewards yet', description: 'Rewards begin at Gold I. Keep earning XP.' }],
  },
  {
    id: 'bronze_3',
    name: 'Bronze III',
    group: 'bronze',
    xpRequired: 5_000,
    color: '#cd7f32',
    glowColor: 'rgba(205,127,50,0.35)',
    emoji: '🔶',
    rewards: [{ type: 'nothing', label: 'No rewards yet', description: 'Rewards begin at Gold I. Keep earning XP.' }],
  },

  // ── Silver ───────────────────────────────────────────────────
  {
    id: 'silver_1',
    name: 'Silver I',
    group: 'silver',
    xpRequired: 10_000,
    color: '#b0b8c8',
    glowColor: 'rgba(176,184,200,0.35)',
    emoji: '⚪',
    rewards: [{ type: 'nothing', label: 'No rewards yet', description: 'Rewards begin at Gold I. Keep earning XP.' }],
  },
  {
    id: 'silver_2',
    name: 'Silver II',
    group: 'silver',
    xpRequired: 18_000,
    color: '#b0b8c8',
    glowColor: 'rgba(176,184,200,0.35)',
    emoji: '⚪',
    rewards: [{ type: 'nothing', label: 'No rewards yet', description: 'Rewards begin at Gold I. Keep earning XP.' }],
  },
  {
    id: 'silver_3',
    name: 'Silver III',
    group: 'silver',
    xpRequired: 28_000,
    color: '#b0b8c8',
    glowColor: 'rgba(176,184,200,0.35)',
    emoji: '⚪',
    rewards: [{ type: 'nothing', label: 'No rewards yet', description: 'Rewards begin at Gold I. Keep earning XP.' }],
  },

  // ── Gold ─────────────────────────────────────────────────────
  {
    id: 'gold_1',
    name: 'Gold I',
    group: 'gold',
    xpRequired: 42_000,
    color: '#f5c542',
    glowColor: 'rgba(245,197,66,0.4)',
    emoji: '🟡',
    rewards: [{
      type: 'badge',
      label: 'Gold Spark Badge',
      description: 'An exclusive Gold Spark badge displayed on your profile — earned by fewer than 20% of players.',
    }],
  },
  {
    id: 'gold_2',
    name: 'Gold II',
    group: 'gold',
    xpRequired: 60_000,
    color: '#f5c542',
    glowColor: 'rgba(245,197,66,0.4)',
    emoji: '🟡',
    rewards: [{ type: 'nothing', label: 'Milestone rank', description: 'No new reward — but you\'re closing in on Gold III.' }],
  },
  {
    id: 'gold_3',
    name: 'Gold III',
    group: 'gold',
    xpRequired: 82_000,
    color: '#f5c542',
    glowColor: 'rgba(245,197,66,0.4)',
    emoji: '🟡',
    rewards: [{ type: 'nothing', label: 'Milestone rank', description: 'Almost Platinum — keep the grind going.' }],
  },

  // ── Platinum ─────────────────────────────────────────────────
  {
    id: 'platinum_1',
    name: 'Platinum I',
    group: 'platinum',
    xpRequired: 110_000,
    color: '#a0d8ef',
    glowColor: 'rgba(160,216,239,0.4)',
    emoji: '💜',
    rewards: [{
      type: 'profile_pic',
      label: 'Platinum Profile Pic',
      description: 'A free exclusive Platinum profile picture you can enable from your profile settings.',
      imageUrl: 'https://gnobzfxtxrtcxfhhfjni.supabase.co/storage/v1/object/public/profile-pics/Normal%20tier/Platinum.jpg',
    }],
  },
  {
    id: 'platinum_2',
    name: 'Platinum II',
    group: 'platinum',
    xpRequired: 145_000,
    color: '#a0d8ef',
    glowColor: 'rgba(160,216,239,0.4)',
    emoji: '💜',
    rewards: [{ type: 'nothing', label: 'Milestone rank', description: 'Grinding through Platinum — respect.' }],
  },
  {
    id: 'platinum_3',
    name: 'Platinum III',
    group: 'platinum',
    xpRequired: 185_000,
    color: '#a0d8ef',
    glowColor: 'rgba(160,216,239,0.4)',
    emoji: '💜',
    rewards: [{ type: 'nothing', label: 'Milestone rank', description: 'Diamond is right around the corner.' }],
  },

  // ── Diamond ──────────────────────────────────────────────────
  {
    id: 'diamond_1',
    name: 'Diamond I',
    group: 'diamond',
    xpRequired: 230_000,
    color: '#a8f0ff',
    glowColor: 'rgba(168,240,255,0.45)',
    emoji: '💎',
    rewards: [{
      type: 'album_pic',
      label: 'Diamond Album Pic',
      description: 'A rare Diamond image added to your album — a special collection of pics you can show off on your profile.',
      imageUrl: 'https://gnobzfxtxrtcxfhhfjni.supabase.co/storage/v1/object/public/profile-pics/Normal%20tier/Diamond.jpg',
    }],
  },
  {
    id: 'diamond_2',
    name: 'Diamond II',
    group: 'diamond',
    xpRequired: 285_000,
    color: '#a8f0ff',
    glowColor: 'rgba(168,240,255,0.45)',
    emoji: '💎',
    rewards: [{ type: 'nothing', label: 'Milestone rank', description: 'Elite territory. Almost Diamond III.' }],
  },
  {
    id: 'diamond_3',
    name: 'Diamond III',
    group: 'diamond',
    xpRequired: 350_000,
    color: '#a8f0ff',
    glowColor: 'rgba(168,240,255,0.45)',
    emoji: '💎',
    rewards: [{
      type: 'chat_name_glow',
      label: 'Diamond Name Glow',
      description: 'Your name glows with a cyan diamond shimmer in all chats. Everyone will notice.',
      glowColor: '#a8f0ff',
    }],
  },

  // ── Legend ───────────────────────────────────────────────────
  {
    id: 'legend',
    name: 'Legend',
    group: 'legend',
    xpRequired: 450_000,
    color: '#ff6b00',
    glowColor: 'rgba(255,107,0,0.5)',
    emoji: '👑',
    rewards: [
      {
        type: 'profile_border_glow',
        label: 'Legend Border Glow',
        description: 'A fiery glow surrounds your profile border — visible to everyone who views your profile.',
        glowColor: '#ff6b00',
      },
      {
        type: 'profile_pic',
        label: 'Legend Profile Pic',
        description: 'Exclusive Legend profile picture, free to enable on your profile.',
        imageUrl: 'https://gnobzfxtxrtcxfhhfjni.supabase.co/storage/v1/object/public/profile-pics/Normal%20tier/Legend.jpg',
      },
    ],
  },

  // ── Chillverse OG ────────────────────────────────────────────
  {
    id: 'chillverse_og',
    name: 'Chillverse OG',
    group: 'og',
    xpRequired: 600_000,
    color: '#f5c542',
    glowColor: 'rgba(245,197,66,0.6)',
    emoji: '🌌',
    rewards: [
      {
        type: 'mall_pick',
        label: 'Free Mall Pick',
        description: 'Pick any one item from the Mall — completely free. One-time reward.',
      },
      {
        type: 'chat_name_glow',
        label: 'OG Yellow Name Glow',
        description: 'Your name glows gold in every chat. The rarest flex in Chillverse.',
        glowColor: '#f5c542',
      },
      {
        type: 'album_pic',
        label: 'Chillverse OG Album Pic',
        description: 'The rarest album picture in existence. Less than 1% of players will ever see this.',
        imageUrl: 'https://gnobzfxtxrtcxfhhfjni.supabase.co/storage/v1/object/public/profile-pics/Normal%20tier/ChillverseOG.jpg',
      },
    ],
  },
]

/** Get a user's current rank tier based on their total XP */
export function getUserRankTier(xp: number): RankTier {
  let current = RANK_TIERS[0]
  for (const tier of RANK_TIERS) {
    if (xp >= tier.xpRequired) current = tier
    else break
  }
  return current
}

/** Get the next rank tier above the current one */
export function getNextRankTier(current: RankTier): RankTier | null {
  const idx = RANK_TIERS.findIndex(t => t.id === current.id)
  return idx < RANK_TIERS.length - 1 ? RANK_TIERS[idx + 1] : null
}

/** XP progress toward next rank (0–100) */
export function getRankProgress(xp: number): { pct: number; xpIntoTier: number; xpNeeded: number } {
  const current = getUserRankTier(xp)
  const next    = getNextRankTier(current)
  if (!next) return { pct: 100, xpIntoTier: 0, xpNeeded: 0 }
  const xpIntoTier = xp - current.xpRequired
  const xpNeeded   = next.xpRequired - current.xpRequired
  return { pct: Math.min(100, Math.round((xpIntoTier / xpNeeded) * 100)), xpIntoTier, xpNeeded }
}

/** Format large XP numbers nicely */
export function fmtXP(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}
