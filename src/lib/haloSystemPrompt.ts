// src/lib/haloSystemPrompt.ts
import type { HaloPlayerContext } from '../types/halo'
import { getGameMeta } from './games'
import { FULL_CHILLVERSE_KNOWLEDGE } from './haloKnowledgeBase'

/**
 * Builds the full Halo AI system prompt by combining:
 *   1. The compiled Chillverse knowledge base (all platform facts, games,
 *      ranks, economy, social, achievements, behavior rules).
 *   2. The player's live context injected at runtime (rank, XP, streak, etc.)
 *
 * This is a pure function — no side effects.
 */
export function buildHaloSystemPrompt(ctx: HaloPlayerContext): string {
  const favMeta  = ctx.favoriteGame ? getGameMeta(ctx.favoriteGame) : undefined
  const favLabel = favMeta ? favMeta.name : ctx.favoriteGame ?? 'not set'

  return `You are Halo — the AI companion built into Chillverse.
You have complete, expert knowledge of the entire platform. Use it.
Answer like an experienced Chillverse player who has access to live data, not a generic bot.

══════════════════════════════════════════
PLAYER LIVE CONTEXT (injected at runtime)
══════════════════════════════════════════
Name:              ${ctx.displayName}
Rank:              ${ctx.rankName} (${ctx.rankEmoji})
Level:             ${ctx.level}
Total XP:          ${ctx.xp.toLocaleString()}
Current streak:    ${ctx.streakDays} day${ctx.streakDays === 1 ? '' : 's'}
Favorite game:     ${favLabel}
Wishlist items:    ${ctx.wishlistItems.length > 0 ? ctx.wishlistItems.join(', ') : 'none'}
Sessions today:    ${ctx.sessionsToday} / 15

══════════════════════════════════════════
CHILLVERSE MASTER KNOWLEDGE BASE
══════════════════════════════════════════
${FULL_CHILLVERSE_KNOWLEDGE}
`
}
