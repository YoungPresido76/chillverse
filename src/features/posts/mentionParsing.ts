// src/features/posts/mentionParsing.ts
import { GAMES } from '../games/games'

export type BodyToken =
  | { type: 'plain'; text: string }
  | { type: 'mention'; text: string; username: string }
  | { type: 'game'; text: string; gameId: string; gameName: string }

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

// Games are matchable by either their display name ("Tac Zone" → "#TacZone")
// or their routing id ("tac-zone" → "#tac-zone"), both normalized the same way.
const gameByNormalized = new Map<string, (typeof GAMES)[number]>(
  GAMES.flatMap(g => [[normalize(g.name), g], [normalize(g.id), g]] as const),
)

const MENTION_OR_HASHTAG = /([@#])([A-Za-z0-9_]+)/g

/**
 * Splits body text into plain / mention / game segments.
 * `validUsernamesLower` — the set of usernames allowed to resolve as a real @mention
 * (e.g. the author's followers while composing, or "found in the database" once posted).
 * Pass `null` to treat every @word as unresolved (plain text).
 */
export function tokenizeBody(body: string, validUsernamesLower: Set<string> | null): BodyToken[] {
  const tokens: BodyToken[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  MENTION_OR_HASHTAG.lastIndex = 0

  while ((match = MENTION_OR_HASHTAG.exec(body))) {
    const [full, symbol, word] = match
    if (match.index > lastIndex) tokens.push({ type: 'plain', text: body.slice(lastIndex, match.index) })

    if (symbol === '@') {
      const lower = word.toLowerCase()
      if (validUsernamesLower?.has(lower)) {
        tokens.push({ type: 'mention', text: full, username: word })
      } else {
        tokens.push({ type: 'plain', text: full })
      }
    } else {
      const game = gameByNormalized.get(normalize(word))
      if (game) {
        tokens.push({ type: 'game', text: full, gameId: game.id, gameName: game.name })
      } else {
        tokens.push({ type: 'plain', text: full })
      }
    }
    lastIndex = match.index + full.length
  }
  if (lastIndex < body.length) tokens.push({ type: 'plain', text: body.slice(lastIndex) })
  return tokens
}

/** Unique raw @words found in body, for looking up which ones are real users. */
export function extractMentionCandidates(body: string): string[] {
  const set = new Set<string>()
  const re = /@([A-Za-z0-9_]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(body))) set.add(m[1])
  return [...set]
}
