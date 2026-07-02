// src/hooks/useRoom.ts
// Subscribes to a single room's live state: the room row itself (status
// changes, e.g. waiting -> in_progress) and its player roster (join/leave/kick).
// Both are low-frequency lobby events, so plain `postgres_changes` subscriptions
// are the right tool here (no need for Broadcast until real in-game moves exist).

import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { fetchRoom, fetchRoomPlayers, type RoomRow, type RoomPlayerRow } from '../lib/rooms'

export interface RoomPlayerWithProfile extends RoomPlayerRow {
  username: string | null
  display_name: string | null
  avatar: string | null
}

export function useRoom(roomId: string | null) {
  const [room, setRoom] = useState<RoomRow | null>(null)
  const [players, setPlayers] = useState<RoomPlayerWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const wasInProgressRef = useRef(false)

  const reloadPlayers = useCallback(async (id: string) => {
    try {
      const rows = await fetchRoomPlayers(id)
      if (rows.length === 0) {
        setPlayers([])
        return
      }
      const ids = rows.map(r => r.user_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar')
        .in('id', ids)
      const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]))
      setPlayers(rows.map(r => ({
        ...r,
        username: byId.get(r.user_id)?.username ?? null,
        display_name: byId.get(r.user_id)?.display_name ?? null,
        avatar: byId.get(r.user_id)?.avatar ?? null,
      })))
    } catch (e: any) {
      setError(e.message)
    }
  }, [])

  useEffect(() => {
    if (!roomId) { setRoom(null); setPlayers([]); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([fetchRoom(roomId), reloadPlayers(roomId)])
      .then(([r]) => { if (!cancelled) { setRoom(r); wasInProgressRef.current = r?.status === 'in_progress' } })
      .catch(e => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))

    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
        if (payload.eventType === 'DELETE') { setRoom(null); return }
        setRoom(payload.new as RoomRow)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` }, () => {
        reloadPlayers(roomId)
      })
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [roomId, reloadPlayers])

  return { room, players, loading, error }
}
