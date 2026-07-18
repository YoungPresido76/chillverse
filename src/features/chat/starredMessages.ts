// src/features/chat/starredMessages.ts
// Private, per-user message bookmarks — see migration 0035. Every read/write
// here is scoped to the current user by RLS (auth.uid() = user_id), so no
// staff exception and no notification ever fires; this is purely personal.
import { supabase } from '../../shared/lib/supabase'

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

export async function starMessage(userId: string, messageId: string): Promise<{ error: string | null }> {
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

/** Full hydrated list for the Starred panel — every starred message across
 *  every room, newest star first, with just enough context (room, sender,
 *  content) to display and jump back to the source conversation. */
export async function fetchStarredMessages(userId: string): Promise<StarredMessageEntry[]> {
  const { data: stars } = await supabase
    .from('starred_messages').select('message_id, created_at').eq('user_id', userId).order('created_at', { ascending: false })
  if (!stars || stars.length === 0) return []

  const messageIds = stars.map(s => s.message_id)
  const { data: messages } = await supabase
    .from('messages').select('id, room_id, sender_id, content, type, deleted, created_at').in('id', messageIds)
  if (!messages || messages.length === 0) return []

  const senderIds = [...new Set(messages.map(m => m.sender_id))]
  const { data: senders } = await supabase.from('profiles').select('id, username, display_name').in('id', senderIds)
  const senderById = new Map((senders ?? []).map(p => [p.id, p]))
  const messageById = new Map(messages.map(m => [m.id, m]))

  const entries: StarredMessageEntry[] = []
  for (const s of stars) {
    const m = messageById.get(s.message_id)
    if (!m) continue // message row is gone (or never existed) — skip rather than show a broken entry
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
