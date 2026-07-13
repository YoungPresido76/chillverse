// supabase/functions/cancel-premium/index.ts
// Called from Settings.tsx when a player taps "Cancel Subscription".
//
// Fixes the "phantom cancel button" discrepancy: Pro.tsx has always told
// players "Cancel anytime from Settings," but until this function existed
// there was no cancellation flow anywhere in the app.
//
// What this does NOT do: it does not immediately revoke access. It disables
// future renewal on Paystack's side (via POST /subscription/disable) and
// sets profiles.pro_cancel_at_period_end = true. The player keeps their
// current tier/perks until pro_expires_at, same as cancelling any other
// subscription — they just won't be charged again after that date.
//
// Paystack's disable-subscription endpoint requires both the subscription's
// `code` and its `email_token` — neither is stored anywhere in this project
// today (activate-premium never persisted them), so this function looks the
// active subscription up live via GET /subscription?customer=<email> and
// matches it to the plan_code for the player's current tier/interval.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { preflightResponse } from '../_shared/cors.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'
import { authenticate } from '../_shared/auth.ts'
import { enforceRateLimit } from '../_shared/rateLimit.ts'

type ProTier = 'orbit' | 'void'
type BillingInterval = 'monthly' | 'yearly'

// Server-side source of truth — keep in sync with src/shared/lib/proPlans.ts
// PLAN_CODES and supabase/functions/activate-premium/index.ts PLAN_CODE_MAP.
const TIER_INTERVAL_TO_PLAN_CODE: Record<ProTier, Record<BillingInterval, string>> = {
  orbit: { monthly: 'PLN_9jnq69avo1tr60t', yearly: 'PLN_iqt6skasttaqc79' },
  void: { monthly: 'PLN_aaz0myfn9x3s819', yearly: 'PLN_9bhvy7t70adfro9' },
}

interface PaystackSubscription {
  subscription_code: string
  email_token: string
  status: string
  plan: { plan_code: string } | null
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
    const adminClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

    // Cancellation is sensitive/low-frequency by nature — a tight limit is
    // appropriate here.
    const rateLimited = await enforceRateLimit(req, adminClient, {
      key: `cancel-premium:${user.id}`,
      limit: 5,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // ── Load the player's current plan ──
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('is_pro, pro_tier, pro_billing_interval, pro_expires_at, pro_cancel_at_period_end')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return errorResponse(req, 'Profile not found', 404)
    }

    if (!profile.is_pro || !profile.pro_tier) {
      return errorResponse(req, "You don't have an active subscription to cancel.", 400)
    }

    if (profile.pro_cancel_at_period_end) {
      return jsonResponse(req, {
        success: true,
        already_cancelled: true,
        expires_at: profile.pro_expires_at,
      })
    }

    const tier = profile.pro_tier as ProTier
    const interval = (profile.pro_billing_interval ?? 'monthly') as BillingInterval
    const planCode = TIER_INTERVAL_TO_PLAN_CODE[tier]?.[interval]

    if (!planCode || !user.email) {
      return errorResponse(req, 'Unable to resolve your subscription plan.', 400)
    }

    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!paystackSecret) {
      return errorResponse(req, 'Payment provider unavailable', 502)
    }

    // ── Find the active Paystack subscription for this customer + plan ──
    const listRes = await fetch(
      `https://api.paystack.co/subscription?customer=${encodeURIComponent(user.email)}&perPage=50`,
      { headers: { Authorization: `Bearer ${paystackSecret}` } },
    )
    const listJson = await listRes.json()

    if (!listRes.ok) {
      console.error('cancel-premium: failed to list subscriptions', listJson)
      return errorResponse(req, 'Could not reach the payment provider. Please try again.', 502)
    }

    const subscriptions: PaystackSubscription[] = listJson?.data ?? []
    const activeSub = subscriptions.find(
      s => s.plan?.plan_code === planCode && s.status === 'active',
    )

    if (!activeSub) {
      // No live Paystack subscription found (e.g. plan was granted manually,
      // or already lapsed). Nothing to disable on Paystack's side, but we
      // still record the cancellation so it stops appearing renewable and
      // won't be double-charged if a subscription does turn up later.
      await adminClient.from('profiles').update({ pro_cancel_at_period_end: true }).eq('id', user.id)
      return jsonResponse(req, {
        success: true,
        no_paystack_subscription_found: true,
        expires_at: profile.pro_expires_at,
      })
    }

    // ── Disable the subscription on Paystack (stops future renewal) ──
    const disableRes = await fetch('https://api.paystack.co/subscription/disable', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: activeSub.subscription_code,
        token: activeSub.email_token,
      }),
    })
    const disableJson = await disableRes.json()

    if (!disableRes.ok || disableJson?.status !== true) {
      console.error('cancel-premium: Paystack disable failed', disableJson)
      return errorResponse(req, 'Failed to cancel your subscription. Please try again or contact support.', 502)
    }

    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ pro_cancel_at_period_end: true })
      .eq('id', user.id)

    if (updateError) {
      console.error('cancel-premium: failed to persist cancellation flag', updateError)
      return errorResponse(
        req,
        "Subscription cancelled with Paystack, but we couldn't update your account. Please contact support.",
        500,
      )
    }

    return jsonResponse(req, { success: true, expires_at: profile.pro_expires_at })
  } catch (err) {
    console.error('cancel-premium error:', err)
    return errorResponse(req, 'Internal error', 500)
  }
})
