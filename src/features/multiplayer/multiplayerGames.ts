// src/lib/multiplayerGames.ts
// Thin wrappers around the server-authoritative RPCs for live multiplayer
// games. All rules, turn validation, win detection, and XP live in Postgres
// (see 0008_multiplayer_games.sql) — this file just calls them and types
// the state shape that comes back on `rooms.game_state`.
import { supabase } from '../../shared/lib/supabase'

// ─── Tac Zone (tic-tac-toe) ─────────────────────────────────────
export interface TacState {
  board: (('X' | 'O') | null)[]
  players: { X: string; O: string }
  winner: 'X' | 'O' | 'draw' | null
  winner_user?: string
  started_at: string
}

export async function tacStart(roomId: string): Promise<TacState> {
  const { data, error } = await supabase.rpc('tac_start', { p_room_id: roomId })
  if (error) throw new Error(error.message)
  return data as TacState
}

export async function tacMove(roomId: string, cell: number): Promise<TacState> {
  const { data, error } = await supabase.rpc('tac_move', { p_room_id: roomId, p_cell: cell })
  if (error) throw new Error(error.message)
  return data as TacState
}

// ─── Pattern King Relay ─────────────────────────────────────────
export interface PKState {
  players: [string, string]
  active_idx: 0 | 1
  round: number
  rounds_completed: number
  grid: string[]
  target_sym: string
  phase: 'peek' | 'match' | 'done'
  phase_started_at: string
  peek_ms: number
  deadline: string | null
  picks: number[]
  winner: string | null
  loser: string | null
  started_at: string
}

export async function pkStart(roomId: string): Promise<PKState> {
  const { data, error } = await supabase.rpc('pk_start', { p_room_id: roomId })
  if (error) throw new Error(error.message)
  return data as PKState
}

export async function pkBeginMatch(roomId: string): Promise<PKState> {
  const { data, error } = await supabase.rpc('pk_begin_match', { p_room_id: roomId })
  if (error) throw new Error(error.message)
  return data as PKState
}

export async function pkPick(roomId: string, index: number): Promise<PKState> {
  const { data, error } = await supabase.rpc('pk_pick', { p_room_id: roomId, p_index: index })
  if (error) throw new Error(error.message)
  return data as PKState
}

export async function pkTimeout(roomId: string): Promise<PKState> {
  const { data, error } = await supabase.rpc('pk_timeout', { p_room_id: roomId })
  if (error) throw new Error(error.message)
  return data as PKState
}
