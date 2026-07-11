import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Tables with a user_id column and NO foreign key / cascade — confirmed via
// information_schema query. These must be cleaned up manually or they are
// orphaned forever after the auth user is deleted.
const HARD_DELETE_TABLES = [
  'notifications',
  'player_achievements',
  'player_game_ranks',
  'user_inventory',
  'user_wallets',
  'user_weekly_missions',
] as const

// diamond_transactions and purchase_history are intentionally left alone.
// Their user_id stays as-is for accounting/dispute records — once the
// profile is gone, that id no longer resolves to anything, so the rows
// are effectively anonymous without needing a placeholder account.

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401 })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const callerClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userError } = await callerClient.auth.getUser()
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), { status: 401 })
    }

    const userId = userData.user.id
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    for (const table of HARD_DELETE_TABLES) {
      const { error } = await adminClient.from(table).delete().eq('user_id', userId)
      if (error) {
        console.error(`[delete-account] failed to delete from ${table}:`, error.message)
        return new Response(JSON.stringify({ error: `Failed to clean up ${table}` }), { status: 500 })
      }
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
    if (deleteError) {
      console.error('[delete-account] failed to delete auth user:', deleteError.message)
      return new Response(JSON.stringify({ error: 'Failed to delete account' }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error('[delete-account] unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Unexpected server error' }), { status: 500 })
  }
})
