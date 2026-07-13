// supabase/functions/activate-premium/index.ts
// Called from Pro.tsx right after Paystack's inline checkout succeeds.
// Verifies the transaction server-side with Paystack (never trust the
// client's word that a charge succeeded), then marks the user's profile
// as Premium for the tier/interval they actually paid for.
//
// SECURITY FIX (critical, already applied previously — kept intact here):
// the previous version matched the claimed tier/interval against
// `verifyJson.data.metadata`, but that metadata is exactly what the CLIENT
// passed into PaystackPop.setup() at checkout init — Paystack echoes it
// back verbatim without validating it against the actual plan/amount
// charged. That meant a user could check out against the cheapest
// plan_code while sending metadata claiming the priciest tier/interval, and
// get premium activated for the wrong price. This version instead resolves
// tier/interval from the transaction's own `plan.plan_code` (Paystack's
// authoritative record of what was actually subscribed/charged) against a
// server-side price table.
//
// NOTE: this only handles the *first* activation. Recurring renewal
// charges come from Paystack as webhook events (charge.success on the
// subscription code) — those should extend pro_expires_at from your
// existing paystack-webhook function, not from here.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { preflightResponse } from '../_shared/cors.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'
import { authenticate, assertMatchesCaller } from '../_shared/auth.ts'
import { enforceRateLimit } from '../_shared/rateLimit.ts'

type ProTier = 'orbit' | 'void'
type BillingInterval = 'monthly' | 'yearly'

interface ActivateRequestBody {
  reference: string
  user_id?: string
}

// Server-side source of truth — keep in sync with src/shared/lib/proPlans.ts
// PLAN_CODES. Get the real codes from your Paystack dashboard (Payments →
// Plans) if these don't match; they must be exact.
const PLAN_CODE_MAP: Record<string, { tier: ProTier; interval: BillingInterval }> = {
  PLN_9jnq69avo1tr60t: { tier: 'orbit', interval: 'monthly' },
  PLN_iqt6skasttaqc79: { tier: 'orbit', interval: 'yearly' },
  PLN_aaz0myfn9x3s819: { tier: 'void', interval: 'monthly' },
  PLN_9bhvy7t70adfro9: { tier: 'void', interval: 'yearly' },
}

function addInterval(from: Date, interval: BillingInterval): Date {
  const d = new Date(from)
  if (interval === 'monthly') d.setMonth(d.getMonth() + 1)
  else d.setFullYear(d.getFullYear() + 1)
  return d
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return preflightResponse(req)
  }

  if (req.method !== 'POST') {
    return errorResponse(req, 'Method not allowed', 405)
  }

  try {
    // ── Auth: verify the Supabase JWT from the Authorization header ──
    const authResult = await authenticate(req)
    if (!authResult.ok) return authResult.response
    const { user } = authResult.auth

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

    // ── Rate limit this activation endpoint per user ──
    const rateLimited = await enforceRateLimit(req, admin, {
      key: `activate-premium:${user.id}`,
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // ── Input validation ──
    const body: ActivateRequestBody = await req.json()
    const { reference, user_id } = body

    if (!reference || typeof reference !== 'string') {
      return errorResponse(req, 'reference is required', 400)
    }

    const mismatch = assertMatchesCaller(req, authResult.auth, user_id)
    if (mismatch) return mismatch

    // ── Verify the transaction with Paystack (server-side, secret key) ──
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!paystackSecret) {
      return errorResponse(req, 'Payment verification unavailable', 502)
    }

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${paystackSecret}` },
    })
    const verifyJson = await verifyRes.json()

    if (!verifyRes.ok || verifyJson?.data?.status !== 'success') {
      return errorResponse(req, 'Transaction not successful', 402)
    }

    // Resolve tier/interval from Paystack's own record of the plan actually
    // charged — never from client-supplied request fields or echoed metadata.
    const planCode: string | undefined = verifyJson.data?.plan?.plan_code
    const resolved = planCode ? PLAN_CODE_MAP[planCode] : undefined

    if (!resolved) {
      console.error('activate-premium: unknown or missing plan_code', planCode)
      return errorResponse(req, 'Unrecognized subscription plan', 400)
    }

    const { tier, interval } = resolved

    // ── Activate: write with the service role (bypasses RLS) ──
    const expiresAt = addInterval(new Date(), interval)

    const { error: updateError } = await admin
      .from('profiles')
      .update({
        is_pro: true,
        pro_tier: tier,
        pro_billing_interval: interval,
        pro_expires_at: expiresAt.toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      return errorResponse(req, 'Failed to activate plan', 500)
    }

    return jsonResponse(req, { success: true, tier, interval, expires_at: expiresAt.toISOString() })
  } catch (err) {
    console.error('activate-premium error:', err)
    return errorResponse(req, 'Internal error', 500)
  }
})
