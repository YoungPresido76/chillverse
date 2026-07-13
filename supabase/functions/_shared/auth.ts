// supabase/functions/_shared/auth.ts
//
// Verifies the caller's Supabase-issued JWT (from the
// `Authorization: Bearer <token>` header) and returns the authenticated
// user. Every edge function that acts on behalf of a specific player MUST
// call authenticate() and derive the user id from its result — never from a
// client-supplied `user_id` field in the request body, since the caller
// controls that value and can set it to anyone's id.
//
// (This project had exactly that bug in credit-diamonds: it trusted a
// client-supplied user_id outright. See that function's rewritten version
// for the fix — it now calls authenticate() + assertMatchesCaller() like
// every other function here.)

import { createClient, type User } from 'https://esm.sh/@supabase/supabase-js@2'
import { errorResponse } from './response.ts'

export interface AuthSuccess {
  user: User
  jwt: string
}

export type AuthResult =
  | { ok: true; auth: AuthSuccess }
  | { ok: false; response: Response }

/**
 * Verifies the Authorization header against Supabase Auth. Returns either
 * the authenticated user or a ready-to-return 401/500 Response.
 */
export async function authenticate(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (!jwt) {
    return { ok: false, response: errorResponse(req, 'Missing or malformed Authorization header', 401) }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('auth middleware: SUPABASE_URL / SUPABASE_ANON_KEY not set')
    return { ok: false, response: errorResponse(req, 'Server misconfiguration', 500) }
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })

  const { data, error } = await authClient.auth.getUser(jwt)

  if (error || !data?.user) {
    return { ok: false, response: errorResponse(req, 'Invalid or expired session', 401) }
  }

  return { ok: true, auth: { user: data.user, jwt } }
}

/**
 * Some request bodies (kept for backward compatibility with existing
 * clients) still include a `user_id` field. This never grants any
 * authority on its own — it's only checked against the authenticated
 * session and rejected on mismatch, so a caller can't act as another user
 * by editing the request body.
 */
export function assertMatchesCaller(req: Request, auth: AuthSuccess, claimedUserId: unknown): Response | null {
  if (claimedUserId !== undefined && claimedUserId !== null && claimedUserId !== auth.user.id) {
    return errorResponse(req, 'user_id does not match the authenticated session', 403)
  }
  return null
}

/**
 * For internal/cron-triggered functions with no end-user session (e.g.
 * scheduled cleanup jobs). Verifies a shared secret passed in the
 * `X-Cron-Secret` header against the CRON_SECRET env var, instead of a user
 * JWT. Never expose this secret to the browser bundle.
 */
export function authenticateCron(req: Request): Response | null {
  const expected = Deno.env.get('CRON_SECRET')
  if (!expected) {
    console.error('authenticateCron: CRON_SECRET not set — refusing to run unauthenticated')
    return errorResponse(req, 'Server misconfiguration', 500)
  }

  const provided = req.headers.get('X-Cron-Secret') ?? ''
  if (provided !== expected) {
    return errorResponse(req, 'Unauthorized', 401)
  }

  return null
}
