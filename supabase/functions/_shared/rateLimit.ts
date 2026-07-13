// supabase/functions/_shared/rateLimit.ts
//
// Postgres-backed fixed-window rate limiter. An in-memory counter would NOT
// be safe here — each edge function invocation can be scheduled onto a
// different isolate/instance, so state needs to live in the database. The
// increment happens in a single atomic UPSERT inside the
// check_and_increment_rate_limit() function (see
// supabase/migrations/0023_rate_limiting.sql), so concurrent requests can't
// race past the limit.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { errorResponse } from './response.ts'

export interface RateLimitOptions {
  /** Unique key to scope this limit by — e.g. `credit-diamonds:${userId}`. */
  key: string
  /** Max requests allowed within the window. */
  limit: number
  /** Window size in seconds. */
  windowSeconds: number
}

/**
 * Checks and increments the rate limit counter for `key`. Returns a ready
 * 429 Response if the limit was exceeded, or null if the request should
 * proceed. Must be called with a service-role Supabase client, since the
 * rate_limits table has no anon/authenticated RLS policies by design.
 */
export async function enforceRateLimit(
  req: Request,
  admin: SupabaseClient,
  { key, limit, windowSeconds }: RateLimitOptions,
): Promise<Response | null> {
  const { data, error } = await admin.rpc('check_and_increment_rate_limit', {
    p_key: key,
    p_window_seconds: windowSeconds,
  })

  if (error) {
    // Fail OPEN on limiter infrastructure errors: a broken rate limiter
    // should never be able to take an entire feature down. Logged loudly so
    // it gets noticed and fixed.
    console.error('rate limit check failed, allowing request through:', error)
    return null
  }

  const count = data as number
  if (count > limit) {
    return errorResponse(req, 'Too many requests — please slow down and try again shortly.', 429, {
      'Retry-After': String(windowSeconds),
    })
  }

  return null
}
