// src/features/profile/liveActivityAccess.ts
//
// Gates the live activity ticker (Realtime Presence on the
// `user-activity:${userId}` channel — see useGamePresence.ts, Watch.tsx,
// Exploration.tsx for broadcasters) behind the viewed user's
// live_activity_visibility setting:
//   'everyone'  — anyone can see it
//   'followers' — only people who follow the viewed user can see it
//   'none'      — hidden from everyone but the user themself
//
// Always call this BEFORE subscribing to the presence channel, not just
// before rendering — subscribing at all reveals that *something* is being
// watched, and the setting is meant to hide activity, not just the UI for it.
import { supabase } from '../../shared/lib/supabase'

export async function canSeeLiveActivity(viewerId: string | null, profileId: string): Promise<boolean> {
  if (viewerId && viewerId === profileId) return true

  const { data: profile } = await supabase
    .from('profiles')
    .select('live_activity_visibility')
    .eq('id', profileId)
    .single()

  const scope = profile?.live_activity_visibility ?? 'everyone'
  if (scope === 'none') return false
  if (scope === 'everyone') return true

  // scope === 'followers'
  if (!viewerId) return false
  const { data: followRow } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', viewerId)
    .eq('following_id', profileId)
    .maybeSingle()

  return !!followRow
}
