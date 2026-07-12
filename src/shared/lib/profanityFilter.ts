// src/shared/lib/profanityFilter.ts
//
// Baseline client-side profanity / hate-speech check, used to give the
// player immediate inline feedback before a chat message, post, or comment
// is even sent to Supabase.
//
// This is a UX convenience only — it is NOT the source of truth. The real
// enforcement lives server-side as Postgres triggers on `messages`, `posts`,
// and `comments` (see supabase/migrations/0017_reporting_and_content_safety.sql,
// function `public.contains_blocked_language`), since a client-side-only
// check can trivially be bypassed by anyone calling the Supabase client
// directly. Keep this word list in sync with that migration's list.
//
// This intentionally targets clear slurs/hate speech and severe harassment
// terms rather than mild profanity, mirroring the scope of the existing
// BANNED_PATTERNS username filter in Settings.tsx.

const BLOCKED_PATTERNS: RegExp[] = [
  /\bnigger\b/i,
  /\bnigga\b/i,
  /\bfaggot\b/i,
  /\bfag\b/i,
  /\bretard(ed)?\b/i,
  /\bspastic\b/i,
  /\bchink\b/i,
  /\bspic\b/i,
  /\bkike\b/i,
  /\btranny\b/i,
  /\bcunt\b/i,
  /\brapist\b/i,
]

/** True if `text` contains a blocked slur/hate-speech term. */
export function containsProfanity(text: string): boolean {
  return BLOCKED_PATTERNS.some(pattern => pattern.test(text))
}

/** Friendly, non-judgmental copy shown when a message/post/comment is blocked. */
export const PROFANITY_BLOCKED_MESSAGE =
  "That message contains language that isn't allowed on Chillverse. Please edit it and try again."
