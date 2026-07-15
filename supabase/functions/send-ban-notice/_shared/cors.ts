// supabase/functions/_shared/cors.ts
//
// Centralized CORS policy for every edge function in this project.
//
// SECURITY NOTE: the previous per-function CORS blocks all used
// 'Access-Control-Allow-Origin': '*'. That is safe ONLY for endpoints that
// never read the Authorization header and never rely on cookies — but every
// function in this project authenticates the caller via a bearer JWT, and a
// wildcard origin combined with credentialed requests is exactly the
// configuration that lets any third-party website silently call these
// functions in a victim's browser session. This module reflects the
// request's Origin header back ONLY when it's on the explicit allowlist
// below, and otherwise falls back to the production origin (which will
// cause the browser to reject the response for any other origin, since it
// won't match the actual requesting page).

const ALLOWED_ORIGINS: readonly string[] = [
  'https://chillverse.com.ng',
  'https://www.chillverse.com.ng',
  // Local development (Vite default port).
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

/**
 * Builds the full set of CORS response headers for a given incoming
 * request. Always call this per-request (not once at module scope) so the
 * reflected Origin is correct for the actual caller.
 */
export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
    // Tells caches/CDNs the response varies by Origin, since we don't
    // return a single fixed value.
    Vary: 'Origin',
  }
}

/** Standard response for CORS preflight (OPTIONS) requests. */
export function preflightResponse(req: Request): Response {
  return new Response('ok', { status: 200, headers: buildCorsHeaders(req) })
}
