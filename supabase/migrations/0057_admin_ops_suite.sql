-- supabase/migrations/0056_admin_ops_suite.sql
-- ════════════════════════════════════════════════════════════════════════
-- Migration 0056 — Admin ops suite: feature flags, maintenance mode,
-- broadcast notifications, CSV export, system health.
--
-- Six pieces, each independent:
--
-- 1. feature_flags — a plain key/enabled table. Publicly readable by any
--    authenticated user (the client needs to check it before rendering a
--    game/map), writable only through `admin_set_feature_flag`. Seeded
--    with every game key currently in game_sessions plus the exploration
--    maps and a couple of system-level toggles.
--
-- 2. app_config — a single-row table for maintenance mode. Same
--    read-everyone / write-through-RPC shape as feature_flags, since the
--    client needs to check it on every load before deciding whether to
--    render the app at all.
--
-- 3. client_error_logs — real client-side error capture (wired into the
--    existing ErrorBoundary), so the System Health panel shows actual
--    error volume instead of a fabricated metric. Insertable by the
--    reporting user only, readable only by admins.
--
-- 4. admin_broadcast_notification — inserts one row per user into the
--    existing `notifications` table (there's no separate "announcements"
--    system to build; notifications already renders in-app for everyone).
--
-- 5. admin_export_users / admin_export_transactions — capped, unpaginated
--    jsonb dumps for client-side CSV generation.
--
-- 6. admin_system_health — aggregates real signals: client error volume,
--    report/ticket backlog age, moderation throughput. No fabricated
--    "edge function logs" — this project's client has no access to
--    Supabase's platform logs, so the panel only surfaces what the app
--    itself can actually observe.
-- ════════════════════════════════════════════════════════════════════════

-- 1. Feature flags ─────────────────────────────────────────────────────
create table if not exists public.feature_flags (
  key         text primary key,
  label       text not null,
  description text,
  category    text not null default 'system',
  enabled     boolean not null default true,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id)
);

alter table public.feature_flags enable row level security;

drop policy if exists "feature flags are publicly readable" on public.feature_flags;
create policy "feature flags are publicly readable" on public.feature_flags
  for select using (true);

insert into public.feature_flags (key, label, category)
values
  ('game:pattern_memory', 'Pattern Memory', 'game'),
  ('game:tac_zone',       'Tac Zone',       'game'),
  ('game:two_truths',     'Two Truths',     'game'),
  ('game:colour_block',   'Colour Block',   'game'),
  ('game:liars_grid',     'Liars Grid',     'game'),
  ('game:uno',            'Uno',            'game'),
  ('game:arrow_dash',     'Arrow Dash',     'game'),
  ('game:trivia_clash',   'Trivia Clash',   'game'),
  ('game:speed_math',     'Speed Math',     'game'),
  ('game:close_call',     'Close Call',     'game'),
  ('game:hangman',        'Hangman',        'game'),
  ('game:pattern_king',   'Pattern King',   'game'),
  ('game:rapid_sort',     'Rapid Sort',     'game'),
  ('game:tile_merge',     'Tile Merge',     'game'),
  ('game:flag_rush',      'Flag Rush',      'game'),
  ('map:1', 'Exploration — Map 1', 'map'),
  ('map:2', 'Exploration — Map 2', 'map'),
  ('map:3', 'Exploration — Map 3', 'map'),
  ('map:4', 'Exploration — Map 4 (The Void)', 'map'),
  ('system:chat',         'Chat (global + DMs)',   'system'),
  ('system:multiplayer',  'Multiplayer rooms',     'system'),
  ('system:mall',         'Mall / purchases',      'system'),
  ('system:halo_ai',      'Halo AI assistant',     'system')
on conflict (key) do nothing;

-- 2. Maintenance mode (single row) ────────────────────────────────────
create table if not exists public.app_config (
  id                   int primary key default 1,
  maintenance_enabled  boolean not null default false,
  maintenance_message  text not null default 'Chillverse is down for scheduled maintenance. We''ll be back shortly.',
  maintenance_scheduled_for timestamptz,
  updated_at           timestamptz not null default now(),
  updated_by           uuid references auth.users(id),
  constraint app_config_singleton check (id = 1)
);

alter table public.app_config enable row level security;

drop policy if exists "app config is publicly readable" on public.app_config;
create policy "app config is publicly readable" on public.app_config
  for select using (true);

insert into public.app_config (id) values (1) on conflict (id) do nothing;

-- 3. Client-side error capture ────────────────────────────────────────
create table if not exists public.client_error_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  message    text not null,
  stack      text,
  path       text,
  created_at timestamptz not null default now()
);

alter table public.client_error_logs enable row level security;

drop policy if exists "users can log their own client errors" on public.client_error_logs;
create policy "users can log their own client errors" on public.client_error_logs
  for insert with check (auth.uid() = user_id or user_id is null);

create index if not exists client_error_logs_created_at_idx on public.client_error_logs (created_at desc);

-- 4. Feature flag / maintenance mode admin RPCs ───────────────────────
create or replace function public.admin_set_feature_flag(p_key text, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is null or not public.is_admin_role(v_caller) then
    raise exception 'CV_ADMIN_FORBIDDEN: admin only';
  end if;

  if not exists (select 1 from public.feature_flags where key = p_key) then
    raise exception 'CV_ADMIN_NOT_FOUND: flag not found';
  end if;

  update public.feature_flags
    set enabled = p_enabled, updated_at = now(), updated_by = v_caller
    where key = p_key;

  insert into public.moderation_log (moderator_id, action, target_type, target_id, metadata)
    values (v_caller, 'set_feature_flag', 'feature_flag', p_key, jsonb_build_object('enabled', p_enabled));
end;
$$;

revoke execute on function public.admin_set_feature_flag(text, boolean) from public;
grant execute on function public.admin_set_feature_flag(text, boolean) to authenticated;

create or replace function public.admin_set_maintenance(
  p_enabled boolean,
  p_message text default null,
  p_scheduled_for timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is null or not public.is_admin_role(v_caller) then
    raise exception 'CV_ADMIN_FORBIDDEN: admin only';
  end if;

  update public.app_config set
    maintenance_enabled = p_enabled,
    maintenance_message = coalesce(nullif(trim(p_message), ''), maintenance_message),
    maintenance_scheduled_for = p_scheduled_for,
    updated_at = now(),
    updated_by = v_caller
  where id = 1;

  insert into public.moderation_log (moderator_id, action, target_type, target_id, metadata)
    values (v_caller, 'set_maintenance_mode', 'app_config', '1', jsonb_build_object('enabled', p_enabled, 'scheduled_for', p_scheduled_for));
end;
$$;

revoke execute on function public.admin_set_maintenance(boolean, text, timestamptz) from public;
grant execute on function public.admin_set_maintenance(boolean, text, timestamptz) to authenticated;

-- 5. Client error reporting RPC (wired into ErrorBoundary) ─────────────
create or replace function public.client_log_error(p_message text, p_stack text default null, p_path text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.client_error_logs (user_id, message, stack, path)
    values (auth.uid(), left(coalesce(p_message, 'Unknown error'), 2000), left(p_stack, 4000), left(p_path, 500));
end;
$$;

revoke execute on function public.client_log_error(text, text, text) from public;
grant execute on function public.client_log_error(text, text, text) to authenticated, anon;

-- 6. Broadcast notification ─────────────────────────────────────────────
create or replace function public.admin_broadcast_notification(p_title text, p_body text, p_icon text default 'megaphone')
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_count int;
begin
  if v_caller is null or not public.is_admin_role(v_caller) then
    raise exception 'CV_ADMIN_FORBIDDEN: admin only';
  end if;

  if p_title is null or trim(p_title) = '' or p_body is null or trim(p_body) = '' then
    raise exception 'CV_ADMIN_VALIDATION: title and body are required';
  end if;

  insert into public.notifications (user_id, type, title, body, icon)
    select id, 'announcement', p_title, p_body, coalesce(p_icon, 'megaphone')
    from public.profiles;

  get diagnostics v_count = row_count;

  insert into public.moderation_log (moderator_id, action, target_type, target_id, metadata)
    values (v_caller, 'broadcast_notification', 'notification', null, jsonb_build_object('title', p_title, 'recipients', v_count));

  return v_count;
end;
$$;

revoke execute on function public.admin_broadcast_notification(text, text, text) from public;
grant execute on function public.admin_broadcast_notification(text, text, text) to authenticated;

-- 7. CSV export sources ─────────────────────────────────────────────────
create or replace function public.admin_export_users()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_rows jsonb;
begin
  if v_caller is null or not public.is_admin_role(v_caller) then
    raise exception 'CV_ADMIN_FORBIDDEN: admin only';
  end if;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_rows
  from (
    select
      p.id, p.username, p.display_name, u.email,
      coalesce(w.gem_balance, 0) as gem_balance,
      p.is_pro, p.pro_tier,
      coalesce(um.role, 'user') as staff_role,
      coalesce(um.is_banned, false) as is_banned,
      p.created_at, p.last_seen_at
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.user_wallets w on w.user_id = p.id
    left join public.user_moderation um on um.user_id = p.id
    order by p.created_at desc
    limit 10000
  ) t;

  insert into public.moderation_log (moderator_id, action, target_type, target_id, metadata)
    values (v_caller, 'export_users', 'export', null, jsonb_build_object('row_count', jsonb_array_length(v_rows)));

  return v_rows;
end;
$$;

revoke execute on function public.admin_export_users() from public;
grant execute on function public.admin_export_users() to authenticated;

create or replace function public.admin_export_transactions(p_limit int default 5000)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_rows jsonb;
  v_limit int;
begin
  if v_caller is null or not public.is_admin_role(v_caller) then
    raise exception 'CV_ADMIN_FORBIDDEN: admin only';
  end if;

  v_limit := least(greatest(coalesce(p_limit, 5000), 1), 20000);

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_rows
  from (
    select dt.id, dt.user_id, p.username, dt.amount, dt.description, dt.reference, dt.pack_id, dt.created_at
    from public.diamond_transactions dt
    left join public.profiles p on p.id = dt.user_id
    order by dt.created_at desc
    limit v_limit
  ) t;

  insert into public.moderation_log (moderator_id, action, target_type, target_id, metadata)
    values (v_caller, 'export_transactions', 'export', null, jsonb_build_object('row_count', jsonb_array_length(v_rows)));

  return v_rows;
end;
$$;

revoke execute on function public.admin_export_transactions(int) from public;
grant execute on function public.admin_export_transactions(int) to authenticated;

-- 8. System health ──────────────────────────────────────────────────────
create or replace function public.admin_system_health()
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

    'client_errors', jsonb_build_object(
      'errors_24h', (select count(*) from public.client_error_logs where created_at >= now() - interval '24 hours'),
      'errors_7d', (select count(*) from public.client_error_logs where created_at >= now() - interval '7 days'),
      'top_messages_7d', (
        select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
          select message, count(*) as occurrences
          from public.client_error_logs
          where created_at >= now() - interval '7 days'
          group by message
          order by count(*) desc
          limit 6
        ) t
      )
    ),

    'moderation_backlog', jsonb_build_object(
      'open_reports', (select count(*) from public.content_reports where status = 'open'),
      'oldest_open_report_age_hours', (
        select round(extract(epoch from (now() - min(created_at))) / 3600)
        from public.content_reports where status = 'open'
      ),
      'actions_24h', (select count(*) from public.moderation_log where created_at >= now() - interval '24 hours')
    ),

    'support_backlog', jsonb_build_object(
      'open_tickets', (select count(*) from public.support_tickets where status not in ('closed', 'resolved')),
      'oldest_open_ticket_age_hours', (
        select round(extract(epoch from (now() - min(created_at))) / 3600)
        from public.support_tickets where status not in ('closed', 'resolved')
      )
    ),

    'flags', jsonb_build_object(
      'disabled_count', (select count(*) from public.feature_flags where not enabled),
      'maintenance_enabled', (select maintenance_enabled from public.app_config where id = 1)
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.admin_system_health() from public;
grant execute on function public.admin_system_health() to authenticated;

notify pgrst, 'reload schema';
