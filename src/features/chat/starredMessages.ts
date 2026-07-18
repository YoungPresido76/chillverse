// src/features/chat/starredMessages.ts
// Private, per-user message bookmarks — see migration 0046. Every read/write
// here is scoped to the current user by RLS (auth.uid() = user_id), so no
// staff exception and no notification ever fires; this is purely personal.
//
// Starring is exclusive to DMs (Global Chat messages can't be starred — see
// toggleStar's room-type guard in Chat.tsx) and capped at MAX_STARRED_PER_ROOM
// per conversation: once a DM hits the cap, the user has to unstar something
// in that DM before starring another message there.
import { supabase } from '../../shared/lib/supabase'

export const MAX_STARRED_PER_ROOM = 5

export interface StarredMessageEntry {
  messageId: string
  starredAt: string
  roomId: string
  content: string
  deleted: boolean
  type: string
  createdAt: string
  senderId: string
  senderName: string
}

/** Star a message in a specific DM. Enforces the per-room cap client-side
 *  (this is UX guidance, not a security boundary — the only thing actually
 *  gating writes is the RLS policy on the table). */
export async function starMessage(userId: string, messageId: string, roomId: string): Promise<{ error: string | null }> {
  const count = await countStarredInRoom(userId, roomId)
  if (count >= MAX_STARRED_PER_ROOM) {
    return { error: `You can only star up to ${MAX_STARRED_PER_ROOM} messages per chat. Unstar one first.` }
  }
  const { error } = await supabase.from('starred_messages').insert({ user_id: userId, message_id: messageId })
  // Re-starring an already-starred message just hits the PK conflict — not a real error.
  if (error && !error.message?.includes('duplicate key')) return { error: error.message }
  return { error: null }
}

export async function unstarMessage(userId: string, messageId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('starred_messages').delete().eq('user_id', userId).eq('message_id', messageId)
  return { error: error ? error.message : null }
}

/** For showing a filled vs. outline star on each message the viewer has starred. */
export async function fetchMyStarredMessageIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase.from('starred_messages').select('message_id').eq('user_id', userId)
  return new Set((data ?? []).map(r => r.message_id))
}

/** How many messages the user currently has starred in one DM — used both to
 *  enforce the cap before inserting and to show "3/5" style UI. */
export async function countStarredInRoom(userId: string, roomId: string): Promise<number> {
  const { data } = await supabase
    .from('starred_messages')
    .select('message_id, messages!inner(room_id)')
    .eq('user_id', userId)
    .eq('messages.room_id', roomId)
  return data?.length ?? 0
}

/** Hydrated list for the Starred panel, scoped to a single DM — newest star
 *  first, with just enough context (sender, content) to display inline. */
export async function fetchStarredMessages(userId: string, roomId: string): Promise<StarredMessageEntry[]> {
  const { data: stars } = await supabase
    .from('starred_messages').select('message_id, created_at').eq('user_id', userId).order('created_at', { ascending: false })
  if (!stars || stars.length === 0) return []

  const messageIds = stars.map(s => s.message_id)
  const { data: messages } = await supabase
    .from('messages').select('id, room_id, sender_id, content, type, deleted, created_at').in('id', messageIds).eq('room_id', roomId)
  if (!messages || messages.length === 0) return []

  const senderIds = [...new Set(messages.map(m => m.sender_id))]
  const { data: senders } = await supabase.from('profiles').select('id, username, display_name').in('id', senderIds)
  const senderById = new Map((senders ?? []).map(p => [p.id, p]))
  const messageById = new Map(messages.map(m => [m.id, m]))

  const entries: StarredMessageEntry[] = []
  for (const s of stars) {
    const m = messageById.get(s.message_id)
    if (!m) continue // message row is gone, or belongs to a different room — skip rather than show a broken entry
    const sender = senderById.get(m.sender_id)
    entries.push({
      messageId: m.id,
      starredAt: s.created_at,
      roomId: m.room_id,
      content: m.content,
      deleted: m.deleted,
      type: m.type,
      createdAt: m.created_at,
      senderId: m.sender_id,
      senderName: sender ? (sender.display_name || sender.username) : 'Unknown',
    })
  }
  return entries
}
