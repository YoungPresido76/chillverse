// src/lib/rooms.ts
// Thin typed layer over the `rooms` / `room_players` RPCs.
// All mutations go through Postgres functions (see 0006_rooms.sql) —
// there is no direct insert/update/delete on these tables from the client.

import { supabase } from './supabase'

export interface RoomRow {
  id: string
  code: string
  host_id: string
  status: 'waiting' | 'in_progress' | 'finished'
  is_private: boolean
  max_players: number
  game_id: string | null
  created_at: string
  game_state: any | null
  turn_user_id: string | null
}

export interface RoomPlayerRow {
  room_id: string
  user_id: string
  is_host: boolean
  joined_at: string
}

export async function createRoom(opts: { isPrivate?: boolean; maxPlayers?: number; gameId?: string | null }): Promise<{ id: string; code: string }> {
  const { data, error } = await supabase
    .rpc('create_room', {
      p_is_private: opts.isPrivate ?? false,
      p_max_players: opts.maxPlayers ?? 4,
      p_game_id: opts.gameId ?? null,
    })
    .single<{ id: string; code: string }>()
  if (error || !data) throw new Error(error?.message ?? 'Failed to create room')
  return data
}

export async function joinRoomByCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_room_by_code', { p_code: code })
  if (error) throw new Error(error.message)
  return data as string
}

export async function leaveRoom(roomId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_room', { p_room_id: roomId })
  if (error) throw new Error(error.message)
}

export async function kickPlayer(roomId: string, targetUserId: string): Promise<void> {
  const { error } = await supabase.rpc('kick_player', { p_room_id: roomId, p_target_id: targetUserId })
  if (error) throw new Error(error.message)
}

export async function startRoom(roomId: string): Promise<void> {
  const { error } = await supabase.rpc('start_room', { p_room_id: roomId })
  if (error) throw new Error(error.message)
}

export async function fetchPublicRooms(gameId?: string | null): Promise<RoomRow[]> {
  let query = supabase
    .from('rooms')
    .select('*')
    .eq('is_private', false)
    .eq('status', 'waiting')
    .order('created_at', { ascending: false })
    .limit(30)
  if (gameId) query = query.eq('game_id', gameId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as RoomRow[]
}

export async function fetchRoom(roomId: string): Promise<RoomRow | null> {
  const { data, error } = await supabase.from('rooms').select('*').eq('id', roomId).maybeSingle()
  if (error) throw new Error(error.message)
  return data as RoomRow | null
}

export async function fetchRoomPlayers(roomId: string): Promise<RoomPlayerRow[]> {
  const { data, error } = await supabase
    .from('room_players')
    .select('*')
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as RoomPlayerRow[]
}
