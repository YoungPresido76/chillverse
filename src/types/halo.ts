// src/types/halo.ts

export interface HaloMessage {
  id: string
  role: 'user' | 'halo'
  content: string
  timestamp: Date
}

export interface HaloPlayerContext {
  displayName: string
  rankName: string
  rankEmoji: string
  streakDays: number
  favoriteGame: string | null
  wishlistItems: string[]
  sessionsToday: number
  xp: number
  level: number
}
