// supabase/functions/cleanup-rooms/index.ts
//
// Scheduled housekeeping job — deletes stale 'waiting' game rooms older
// than 150 seconds. Meant to be invoked on a schedule (Supabase Cron / a
// pg_cron job calling this via net.http_post), NOT by end users.
//
// SECURITY FIX: the previous version had no authentication at all — the
// function's URL is unauthenticated-by-default at the platform level unless
// `verify_jwt` is enabled, and even with that on, a *user* JWT was never
// the right model here since no user should be able to trigger this.
// Instead this now checks a shared secret (CRON_SECRET) that only your
// scheduler knows, via the X-Cron-Secret header, so an internal job stays
// internal.
//
// Required env vars:
//   SUPABASE_URL                — injected automatically by Supabase
//   SUPABASE_SERVICE_ROLE_KEY   — injected automatically by Supabase
//   CRON_SECRET                 — set in Supabase Dashboard → Edge Functions
//                                  → Secrets; pass the same value as the
//                                  X-Cron-Secret header from whatever
//                                  scheduler calls this function.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { preflightResponse } from '../_shared/cors.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'
import { authenticateCron } from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return preflightResponse(req)
  }

  const authError = authenticateCron(req)
  if (authError) return authError

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { error } = await supabase
      .from('game_rooms')
      .delete()
      .eq('status', 'waiting')
      .lt('created_at', new Date(Date.now() - 150_000).toISOString())

    if (error) {
      return errorResponse(req, error.message, 500)
    }

    return jsonResponse(req, { ok: true })
  } catch (err) {
    console.error('[cleanup-rooms] unexpected error:', err)
    return errorResponse(req, 'Unexpected server error', 500)
  }
})
