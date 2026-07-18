// src/lib/games.ts
// ─── Shared, lightweight game catalog ───────────────────────────
// Pulled out of Games.tsx so other pages (Edit Profile, leaderboards,
// etc.) can reference game metadata — name, icon, accent color, dbKey —
// without importing the full game lobby page and its game components.
import {
  Move, Brain, Drama, BookOpen, Grid3X3,
  Eye, Calculator, LayoutGrid, Hash, Target, Sparkles, Spade, Blocks, Layers,
  type LucideIcon,
} from 'lucide-react'
import type { GameKey } from './gameSession'

export type GameId =
  | 'arrow-dash' | 'pattern-memory' | 'rapid-sort'
  | 'trivia-clash' | 'tac-zone'
  | 'two-truths' | 'speed-math' | 'liars-grid'
  | 'hangman'
  | 'close-call'
  | 'pattern-king'
  | 'uno'
  | 'colour-block'
  | 'tile-merge'

export interface GameMeta {
  id: GameId
  dbKey: GameKey
  name: string
  tagline: string
  accent: string
  unlimitedPlays?: boolean
  sessionCost?: number
  requiresPro?: boolean
  icon: LucideIcon
  // Banner image for the Discord-style game detail sheet. Not every game
  // has one — when it's missing, the detail sheet falls back to using the
  // game's icon as the banner instead of leaving it blank.
  bannerUrl?: string
  // Extra info shown in the detail sheet (Discord-style "About" section).
  description?: string   // a bit longer than tagline — falls back to tagline if unset
  category?: string      // e.g. 'Trivia', 'Puzzle', 'Card Game'
  players?: string        // e.g. 'Solo', 'Solo vs AI'
}

const SB_GAMES_BUCKET = 'https://gnobzfxtxrtcxfhhfjni.supabase.co/storage/v1/object/public/Adverts/Games'

// Standard games — default session cost (1)
const STANDARD_GAMES: GameMeta[] = [
  { id: 'arrow-dash',     dbKey: 'arrow_dash',     name: 'Arrow Dash',            tagline: 'Tap the arrow direction. Fast.',                  accent: '#4f8ef7', icon: Move,       bannerUrl: `${SB_GAMES_BUCKET}/Arrow_dash.png`,
    category: 'Arcade', players: 'Solo', description: 'Reflex game — an arrow flashes on screen and you tap the matching direction before it disappears. Rounds get faster the longer your streak holds.' },
  { id: 'pattern-memory', dbKey: 'pattern_memory', name: 'Pattern Memory',        tagline: 'Watch the sequence, then repeat it.',             accent: '#9b6dff', icon: Brain,
    category: 'Puzzle', players: 'Solo', description: 'A tile sequence lights up, then it\u2019s your turn to repeat it back in order. Each round adds another step, testing how far your memory can stretch.' },
  { id: 'rapid-sort',     dbKey: 'rapid_sort',     name: 'Anime Trivia',          tagline: 'Test your anime knowledge. Time shrinks as your streak grows.', accent: '#9b6dff', icon: Drama, bannerUrl: `${SB_GAMES_BUCKET}/Anime_trivia.png`,
    category: 'Trivia', players: 'Solo', description: 'Rapid-fire anime questions against a shrinking clock. The better your streak, the less time you get per question — built for people who actually know their shows.' },
  { id: 'tac-zone',       dbKey: 'tac_zone',       name: 'Tac Zone',              tagline: 'Three in a row. No mercy.',                      accent: '#3ecf8e', icon: Grid3X3, unlimitedPlays: true, bannerUrl: `${SB_GAMES_BUCKET}/Taczone.png`,
    category: 'Strategy', players: 'Solo', description: 'Classic tic-tac-toe against the AI, sharpened up with rank tracking and streaks. Unlimited plays, so it\u2019s the one to warm up on.' },
  { id: 'two-truths',     dbKey: 'two_truths',     name: 'Two Truths, One False', tagline: 'Spot the lie among three claims.',                accent: '#9b6dff', icon: Eye,
    category: 'Trivia', players: 'Solo', description: 'Three statements, one of them is false. Read closely and pick the odd one out before time runs out.' },
  { id: 'speed-math',     dbKey: 'speed_math',     name: 'Speed Math',            tagline: 'Solve as many equations as you can.',             accent: '#3ecf8e', icon: Calculator,
    category: 'Puzzle', players: 'Solo', description: 'Quick-fire arithmetic under the clock. Accuracy and speed both count toward your score, so don\u2019t just rush.' },
  { id: 'liars-grid',     dbKey: 'liars_grid',     name: "Liar's Grid",           tagline: 'Find the one wrong equation. One is lying.',      accent: '#ff4f4f', icon: LayoutGrid,
    category: 'Puzzle', players: 'Solo', description: 'A grid full of equations, only one of them is wrong. Scan fast, spot the liar, and lock in your answer before the timer catches up.' },
]

// Higher session games — cost more sessions
const PREMIUM_GAMES: GameMeta[] = [
  { id: 'trivia-clash',   dbKey: 'trivia_clash',   name: 'Trivia Clash',          tagline: 'Drop knowledge. Wreck the scoreboard.',           accent: '#ff9a3c', icon: BookOpen, sessionCost: 6, bannerUrl: `${SB_GAMES_BUCKET}/Trivia_clash.png`,
    category: 'Trivia', players: 'Solo', description: 'A deeper, higher-stakes trivia run across mixed categories. Costs more sessions than the standard games, but the questions go further too.' },
  { id: 'hangman',        dbKey: 'hangman',        name: 'Hangman',               tagline: 'Guess the word. One letter at a time.',           accent: '#ff6b00', icon: Hash,     sessionCost: 3, bannerUrl: `${SB_GAMES_BUCKET}/Hangman.png`,
    category: 'Word Game', players: 'Solo', description: 'The classic — guess the hidden word one letter at a time before you run out of tries.' },
  { id: 'close-call',     dbKey: 'close_call',     name: 'Close Call',            tagline: 'Type the closest answer you can. Fast.',          accent: '#ff4d8b', icon: Target,   sessionCost: 4, bannerUrl: `${SB_GAMES_BUCKET}/Close_call.png`,
    category: 'Trivia', players: 'Solo', description: 'You won\u2019t always know the exact answer — so get as close as you can, as fast as you can. Precision and speed both score points.' },
  { id: 'pattern-king',   dbKey: 'pattern_king',   name: 'Pattern King',          tagline: 'Memorize the grid. Clear every pattern before time runs out.', accent: '#00e5ff', icon: Sparkles, sessionCost: 3, bannerUrl: `${SB_GAMES_BUCKET}/Patternking.png`,
    category: 'Puzzle', players: 'Solo', description: 'Study the grid, then clear the highlighted pattern from memory before the timer runs out. Gets sharper and faster as you climb rank.' },
  { id: 'uno',            dbKey: 'uno',            name: 'Chillverse_Uno',        tagline: 'Classic UNO against Halo — a smart AI that remembers your weaknesses.', accent: '#9b6dff', icon: Spade, sessionCost: 4, requiresPro: true,
    category: 'Card Game', players: 'Solo vs AI', description: 'Full UNO rules against Halo, an AI opponent that adapts to how you play and remembers your patterns round after round. Pro-only.' },
  { id: 'colour-block',   dbKey: 'colour_block',   name: 'Colour Block',          tagline: "Memorize the safe tile, survive the shuffle, don't get caught out.", accent: '#ff5fa2', icon: Blocks, sessionCost: 3, requiresPro: true,
    category: 'Puzzle', players: 'Solo', description: 'One tile is safe — memorize it before the board shuffles, then pick it back out. Pro-only, and it gets meaner every round.' },
  { id: 'tile-merge',     dbKey: 'tile_merge',     name: 'Chill Merge',           tagline: 'Place tiles, chain the merges, chase the high score.',           accent: '#38bdf8', icon: Layers, sessionCost: 2, bannerUrl: `${SB_GAMES_BUCKET}/Chill_merge.png`,
    category: 'Puzzle', players: 'Solo', description: 'Drop tiles onto the board and chain matching merges together for bigger combos. Simple to start, hard to put down.' },
]

export const GAMES: GameMeta[] = [...STANDARD_GAMES, ...PREMIUM_GAMES]

export function getGameMeta(dbKey: string): GameMeta | undefined {
  return GAMES.find(g => g.dbKey === dbKey)
}

// Looks up by the hyphenated `id` (e.g. 'tac-zone') — this is the form
// broadcast over Realtime Presence by useGamePresence, NOT the dbKey
// (e.g. 'tac_zone') used for game_sessions rows. Use this one for
// anything reading the live "currently playing" presence state.
export function getGameById(id: string): GameMeta | undefined {
  return GAMES.find(g => g.id === id)
}
