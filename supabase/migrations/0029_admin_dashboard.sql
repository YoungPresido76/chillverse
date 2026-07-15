-- supabase/migrations/0029_admin_dashboard.sql
-- ════════════════════════════════════════════════════════════════════════
-- Migration 0029 — Admin Dashboard stats RPC
--
-- One SECURITY DEFINER function, admin-gated internally, that aggregates
-- everything the Admin Dashboard needs into a single jsonb payload. This
-- keeps the dashboard to one round trip and avoids opening up new SELECT
-- RLS policies on sensitive tables (wallets, diamond_transactions,
-- user_moderation) to the client — the function reads them server-side
-- and returns only the aggregates, never raw rows of other users' data.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_result jsonb;
begin
  if v_caller is null or not public.is_admin_role(v_caller) then
    raise exception 'CV_ADMIN_FORBIDDEN: admin only';
  end if;

  select jsonb_build_object(
    'generated_at', now(),

    'overview', jsonb_build_object(
      'total_users', (select count(*) from public.profiles),
      'new_users_7d', (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
      'new_users_30d', (select count(*) from public.profiles where created_at >= now() - interval '30 days'),
      'active_today', (select count(*) from public.profiles where last_active_date = current_date),
      'active_7d', (select count(*) from public.profiles where last_seen_at >= now() - interval '7 days'),
      'pro_subscribers', (select count(*) from public.profiles where is_pro),
      'pro_orbit', (select count(*) from public.profiles where is_pro and pro_tier = 'orbit'),
      'pro_void', (select count(*) from public.profiles where is_pro and pro_tier = 'void'),
      'staff_count', (select count(*) from public.user_moderation where role in ('staff', 'moderator', 'admin')),
      'banned_users', (select count(*) from public.user_moderation where is_banned)
    ),

    'economy', jsonb_build_object(
      'diamonds_in_circulation', (select coalesce(sum(gem_balance), 0) from public.user_wallets),
      'diamonds_credited_30d', (select coalesce(sum(amount), 0) from public.diamond_transactions where amount > 0 and created_at >= now() - interval '30 days'),
      'purchase_tx_30d', (select count(*) from public.diamond_transactions where created_at >= now() - interval '30 days'),
      'top_mall_items', (
        select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
          select mi.name, mi.category, count(*) as owners
          from public.user_inventory ui
          join public.mall_items mi on mi.id = ui.item_id
          group by mi.id, mi.name, mi.category
          order by count(*) desc
          limit 8
        ) t
      )
    ),

    'games', jsonb_build_object(
      'total_sessions', (select count(*) from public.game_sessions),
      'sessions_7d', (select count(*) from public.game_sessions where played_at >= now() - interval '7 days'),
      'top_games', (
        select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
          select game, count(*) as sessions
          from public.game_sessions
          where played_at >= now() - interval '30 days'
          group by game
          order by count(*) desc
          limit 8
        ) t
      )
    ),

    'multiplayer', jsonb_build_object(
      'active_rooms', (select count(*) from public.rooms where status in ('waiting', 'in_progress')),
      'rooms_7d', (select count(*) from public.rooms where created_at >= now() - interval '7 days'),
      'top_multiplayer_games', (
        select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
          select game_id, count(*) as rooms
          from public.rooms
          where created_at >= now() - interval '30 days'
          group by game_id
          order by count(*) desc
          limit 8
        ) t
      )
    ),

    'halo_ai', jsonb_build_object(
      'questions_7d', (select coalesce(sum(question_count), 0) from public.halo_ai_usage where usage_date >= current_date - 7),
      'questions_30d', (select coalesce(sum(question_count), 0) from public.halo_ai_usage where usage_date >= current_date - 30),
      'active_users_7d', (select count(distinct player_id) from public.halo_ai_usage where usage_date >= current_date - 7),
      'provider_split_30d', (
        select coalesce(jsonb_object_agg(provider, uses), '{}'::jsonb) from (
          select unnest(providers_used) as provider, count(*) as uses
          from public.halo_ai_logs
          where created_at >= now() - interval '30 days'
          group by provider
        ) t
      )
    ),

    'moderation', jsonb_build_object(
      'open_reports', (select count(*) from public.content_reports where status = 'open'),
      'actions_7d', (select count(*) from public.moderation_log where created_at >= now() - interval '7 days'),
      'currently_banned', (select count(*) from public.user_moderation where is_banned and (banned_until is null or banned_until > now()))
    ),

    'support', jsonb_build_object(
      'open_tickets', (select count(*) from public.support_tickets where status not in ('closed', 'resolved')),
      'tickets_7d', (select count(*) from public.support_tickets where created_at >= now() - interval '7 days')
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.admin_dashboard_stats() from public;
grant execute on function public.admin_dashboard_stats() to authenticated;

notify pgrst, 'reload schema';
