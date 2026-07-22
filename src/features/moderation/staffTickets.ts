// src/features/moderation/staffTickets.ts
import { supabase } from '../../shared/lib/supabase'
import { friendlyError } from './moderation'
import type { StaffSupportTicket, SupportTicketReply, SupportTicketNote, SupportTicketStatus } from '../../shared/types'

export type TicketQueueFilter = 'unclaimed' | 'mine' | 'escalated' | 'all'

/** SLA tier for how long a ticket has been open, used to color-flag the queue. */
export type TicketSlaTier = 'ok' | 'warning' | 'breached'

/** Read-only context card for the user behind a ticket — join date, verified status, ban status, strike count. */
export interface TicketUserCard {
  join_date: string
  is_verified: boolean
  is_banned: boolean
  strike_count: number
}

/** Reusable reply templates for the most common ticket categories. Inserted into the reply draft, then editable before sending. */
export interface CannedResponse {
  id: string
  label: string
  body: string
}

export const CANNED_RESPONSES: CannedResponse[] = [
  {
    id: 'password_reset',
    label: 'Password reset',
    body: "Hi! You can reset your password from the login screen — tap \"Forgot password\", enter the email on your account, and a reset link will arrive within a few minutes. Let us know if it doesn't show up and we'll take a closer look.",
  },
  {
    id: 'billing',
    label: 'Billing question',
    body: "Thanks for reaching out about billing. Could you confirm the email address on your account and the approximate date of the charge in question? Once we have that we can look into it and get back to you shortly.",
  },
  {
    id: 'ban_appeal_status',
    label: 'Ban appeal status',
    body: "Thanks for your patience — your appeal has been received and is currently being reviewed by our moderation team. We'll follow up on this ticket as soon as a decision has been made.",
  },
]

/** Returns how overdue an open ticket is, for the SLA pill in the queue. Resolved/closed tickets are never flagged. */
export function getTicketSlaTier(ticket: Pick<StaffSupportTicket, 'created_at' | 'status'>): TicketSlaTier {
  if (ticket.status === 'resolved' || ticket.status === 'closed') return 'ok'
  const ageHours = (Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60)
  if (ageHours >= 48) return 'breached'
  if (ageHours >= 24) return 'warning'
  return 'ok'
}

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

/** Read-only lookup used next to a ticket — join date, verified status, ban status, strike count. Fetched lazily on expand, same pattern as replies/notes. */
export async function fetchTicketUserCard(userId: string): Promise<{ data: TicketUserCard | null; error: string | null }> {
  const { data, error } = await supabase.rpc('staff_get_ticket_user_card', { p_target_id: userId })
  return { data: (data as TicketUserCard | null) ?? null, error: friendlyError(error) }
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
