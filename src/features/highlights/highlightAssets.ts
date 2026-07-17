// src/features/highlights/highlightAssets.ts
//
// Custom Duolingo-style celebratory art, one per highlight kind that uses
// one. Transparent background, sized down to a restrained "sticker" size in
// the card (see HighlightCard.tsx) rather than shown full-bleed.
//
// map_complete uses the author's own profile pic (<Avatar>) instead, and
// leaderboard_badge uses the badge's own icon (<BadgeIcon>) — neither needs
// an entry here.
import type { HighlightKind } from './types'

export const HIGHLIGHT_ILLUSTRATIONS: Partial<Record<HighlightKind, string>> = {
  xp_milestone: 'https://gnobzfxtxrtcxfhhfjni.supabase.co/storage/v1/object/public/Adverts/Untitled%20folder/a37eba2836b82f970db2dac511de3797.png',
  personal_best: 'https://gnobzfxtxrtcxfhhfjni.supabase.co/storage/v1/object/public/Adverts/Untitled%20folder/fbbd1f77ffccf52e076d034cd0bba069.png',
  streak_milestone: 'https://gnobzfxtxrtcxfhhfjni.supabase.co/storage/v1/object/public/Adverts/Untitled%20folder/5930ef6adc94a22142731afff11eb12f.png',
  leaderboard_rank: 'https://gnobzfxtxrtcxfhhfjni.supabase.co/storage/v1/object/public/Adverts/Untitled%20folder/3ca8e7290bf156916a8a3c9bea521238.png',
}
