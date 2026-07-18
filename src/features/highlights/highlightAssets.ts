// src/features/highlights/highlightAssets.ts
//
// Custom Duolingo-style celebratory art, one per highlight kind that uses
// one. Transparent background, sized down to a restrained "sticker" size in
// the card (see HighlightCard.tsx) rather than shown full-bleed.
//
// map_complete uses the author's own profile pic (<Avatar>) instead, and
// leaderboard_badge uses the badge's own icon (<BadgeIcon>) — neither needs
// an entry here.
import furnaceFlame from '../../assets/streak-furnace.png'
import type { HighlightKind } from './types'

export const HIGHLIGHT_ILLUSTRATIONS: Partial<Record<HighlightKind, string>> = {
  xp_milestone: 'https://gnobzfxtxrtcxfhhfjni.supabase.co/storage/v1/object/public/Adverts/Untitled%20folder/rocket_transparent.png',
  personal_best: 'https://gnobzfxtxrtcxfhhfjni.supabase.co/storage/v1/object/public/Adverts/Untitled%20folder/target_transparent.png',
  streak_milestone: furnaceFlame,
  leaderboard_rank: 'https://gnobzfxtxrtcxfhhfjni.supabase.co/storage/v1/object/public/Adverts/Untitled%20folder/trophy_transparent.png',
}

// Kinds whose illustration should bounce in place (matches the "bob"
// animation used for the flame marker on the streak-card-furnace design:
// a gentle rise + tilt, looping every 2.4s).
export const BOUNCING_ILLUSTRATION_KINDS: Partial<Record<HighlightKind, boolean>> = {
  streak_milestone: true,
}
