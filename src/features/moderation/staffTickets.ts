// src/features/moderation/staffTickets.ts
import { supabase } from '../../shared/lib/supabase'
import { friendlyError } from './moderation'
import type { StaffSupportTicket, SupportTicketReply, SupportTicketNote, SupportTicketStatus } from '../../shared/types'

export type TicketQueueFilter = 'unclaimed' | 'mine' | 'escalated' | 'all'

/**
 * Fetches tickets for the staff queue. 'escalated' shows every escalated
 * ticket regardless of assignee (that's the moderator hand-off view);
 * 'mine' and 'unclaimed' are scoped for the signed-in staff member's own
 * workflow; 'all' is the full board.
 */
export async function fetchStaffTickets(
  filter: TicketQueueFilter,
  myUserId: string
): Promise<{ data: StaffSupportTicket[]; error: string | null }> {
  let query = supabase
    .from('support_tickets')
    .select('*, user:profiles!support_tickets_user_id_fkey(username, display_name), assignee:profiles!support_tickets_assigned_to_fkey(username)')
    .order('escalated_to_mod', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(150)

  if (filter === 'unclaimed') query = query.is('assigned_to', null).eq('escalated_to_mod', false)
  if (filter === 'mine') query = query.eq('assigned_to', myUserId)
  if (filter === 'escalated') query = query.eq('escalated_to_mod', true)

  const { data, error } = await query
  return { data: (data as StaffSupportTicket[] | null) ?? [], error: friendlyError(error) }
}

export async function fetchTicketReplies(ticketId: string): Promise<{ data: SupportTicketReply[]; error: string | null }> {
  const { data, error } = await supabase
    .from('support_ticket_replies')
    .select('*, author:profiles!support_ticket_replies_author_id_fkey(username)')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  return { data: (data as SupportTicketReply[] | null) ?? [], error: friendlyError(error) }
}

export async function fetchTicketNotes(ticketId: string): Promise<{ data: SupportTicketNote[]; error: string | null }> {
  const { data, error } = await supabase
    .from('support_ticket_notes')
    .select('*, author:profiles!support_ticket_notes_author_id_fkey(username)')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  return { data: (data as SupportTicketNote[] | null) ?? [], error: friendlyError(error) }
}

export async function claimTicket(ticketId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('staff_claim_ticket', { p_ticket_id: ticketId })
  return { error: friendlyError(error) }
}

export async function unclaimTicket(ticketId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('staff_unclaim_ticket', { p_ticket_id: ticketId })
  return { error: friendlyError(error) }
}

export async function replyToTicket(ticketId: string, body: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('staff_reply_ticket', { p_ticket_id: ticketId, p_body: body })
  return { error: friendlyError(error) }
}

export async function addTicketNote(ticketId: string, body: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('staff_add_ticket_note', { p_ticket_id: ticketId, p_body: body })
  return { error: friendlyError(error) }
}

export async function setTicketStatus(ticketId: string, status: SupportTicketStatus): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('staff_set_ticket_status', { p_ticket_id: ticketId, p_status: status })
  return { error: friendlyError(error) }
}

export async function escalateTicket(ticketId: string, note: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('staff_escalate_ticket', { p_ticket_id: ticketId, p_note: note })
  return { error: friendlyError(error) }
}

export async function deescalateTicket(ticketId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('mod_deescalate_ticket', { p_ticket_id: ticketId })
  return { error: friendlyError(error) }
}
