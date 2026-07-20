-- 0053_secure_missions_and_wallets
-- ALREADY APPLIED to the live database on 2026-07-20 (via MCP, migration name
-- "secure_missions_and_wallets"). Kept here so the repo mirrors production.
--
-- 1. Server-side weekly mission lifecycle (atomic creation, atomic progress,
--    server-verified reward granting) via SECURITY DEFINER RPCs.
-- 2. Tighter RLS: user_weekly_missions is SELECT-only for clients; the
--    wallet_transactions client INSERT/DELETE policies are dropped.
-- 3. protect_privileged_profile_columns trigger blocks direct client updates
--    to xp/level/streak/pro/referral columns.

-- ── 1a. Atomic get-or-create ────────────────────────────────────────────────
create or replace function public.get_or_create_weekly_missions()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_week date := (date_trunc('week', (now() at time zone 'utc')))::date;
  v_row public.user_weekly_missions;
  v_excluded text[];
  v_pool_ids text[];
  v_selected text[] := '{}';
  v_metrics text[] := '{}';
  v_spend_count int := 0;
  v_def record;
begin
  if v_uid is null then
    raise exception 'not authorized';
  end if;

  select * into v_row from public.user_weekly_missions
   where user_id = v_uid and week_start = v_week;

  if not found then
    select coalesce(array_agg(distinct mid), '{}') into v_excluded
    from (
      select unnest(mission_ids) as mid
      from public.user_weekly_missions
      where user_id = v_uid
      order by week_start desc
      limit 4
    ) recent;

    select coalesce(array_agg(id), '{}') into v_pool_ids
    from public.mission_definitions
    where is_active and not (id = any(v_excluded));

    if coalesce(array_length(v_pool_ids, 1), 0) < 5 then
      select coalesce(array_agg(id), '{}') into v_pool_ids
      from public.mission_definitions where is_active;
    end if;

    select id, metric_key, is_spend into v_def
    from public.mission_definitions
    where id = any(v_pool_ids) and category = 'gameplay'
    order by random() limit 1;
    if found then
      v_selected := v_selected || v_def.id;
      v_metrics  := v_metrics  || v_def.metric_key;
      if v_def.is_spend then v_spend_count := v_spend_count + 1; end if;
    end if;

    select id, metric_key, is_spend into v_def
    from public.mission_definitions
    where id = any(v_pool_ids)
      and reward_type = 'xp_and_booster'
      and not (id = any(v_selected))
      and not (metric_key = any(v_metrics))
      and (not is_spend or v_spend_count = 0)
    order by random() limit 1;
    if found then
      v_selected := v_selected || v_def.id;
      v_metrics  := v_metrics  || v_def.metric_key;
      if v_def.is_spend then v_spend_count := v_spend_count + 1; end if;
    end if;

    for v_def in
      select id, metric_key, is_spend
      from public.mission_definitions
      where id = any(v_pool_ids)
      order by random()
    loop
      exit when coalesce(array_length(v_selected, 1), 0) >= 5;
      continue when v_def.id = any(v_selected);
      continue when v_def.metric_key = any(v_metrics);
      continue when v_def.is_spend and v_spend_count >= 1;
      v_selected := v_selected || v_def.id;
      v_metrics  := v_metrics  || v_def.metric_key;
      if v_def.is_spend then v_spend_count := v_spend_count + 1; end if;
    end loop;

    insert into public.user_weekly_missions (user_id, week_start, mission_ids, progress, completed_ids)
    values (v_uid, v_week, v_selected, '{}'::jsonb, '{}')
    on conflict (user_id, week_start) do nothing;

    select * into v_row from public.user_weekly_missions
     where user_id = v_uid and week_start = v_week;
  end if;

  return jsonb_build_object(
    'row', to_jsonb(v_row),
    'definitions', coalesce((
      select jsonb_agg(to_jsonb(d))
      from public.mission_definitions d
      where d.id = any(v_row.mission_ids)
    ), '[]'::jsonb)
  );
end;
$$;

-- ── 1b. Atomic progress + server-verified rewards ───────────────────────────
create or replace function public.record_mission_progress(
  p_metric_key text,
  p_increment  integer default 1,
  p_absolute   boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_week date := (date_trunc('week', (now() at time zone 'utc')))::date;
  v_row public.user_weekly_missions;
  v_amount int;
  v_old int;
  v_new int;
  v_def record;
begin
  if v_uid is null then
    raise exception 'not authorized';
  end if;

  if p_absolute then
    v_amount := least(greatest(coalesce(p_increment, 0), 0), 3650);
  else
    v_amount := least(greatest(coalesce(p_increment, 0), 0), 50);
  end if;

  select * into v_row from public.user_weekly_missions
   where user_id = v_uid and week_start = v_week
   for update;
  if not found then
    return null;
  end if;

  v_old := coalesce((v_row.progress ->> p_metric_key)::int, 0);
  v_new := case when p_absolute then greatest(v_old, v_amount) else v_old + v_amount end;
  v_row.progress := jsonb_set(coalesce(v_row.progress, '{}'::jsonb),
                              array[p_metric_key], to_jsonb(v_new), true);

  for v_def in
    select * from public.mission_definitions
    where id = any(v_row.mission_ids)
      and metric_key = p_metric_key
      and is_active
  loop
    if v_new >= v_def.target_value and not (v_def.id = any(v_row.completed_ids)) then
      v_row.completed_ids := v_row.completed_ids || v_def.id;

      if v_def.xp_reward > 0 then
        update public.profiles
           set xp = xp + least(v_def.xp_reward, 20000),
               level = floor((xp + least(v_def.xp_reward, 20000)) / 1000) + 1
         where id = v_uid;
        v_row.total_xp_earned := coalesce(v_row.total_xp_earned, 0) + v_def.xp_reward;
      end if;

      if v_def.reward_type = 'xp_and_booster' then
        v_row.boosters_earned := coalesce(v_row.boosters_earned, 0) + 1;
      end if;

      if v_def.diamond_reward > 0 then
        insert into public.user_wallets (user_id, gem_balance)
        values (v_uid, v_def.diamond_reward)
        on conflict (user_id)
        do update set gem_balance = public.user_wallets.gem_balance + excluded.gem_balance,
                      updated_at = now();
        insert into public.diamond_transactions (user_id, reference, amount, description)
        values (v_uid, 'mission:' || v_def.id, v_def.diamond_reward,
                'Weekly mission reward: ' || v_def.title);
        v_row.total_diamonds_earned := coalesce(v_row.total_diamonds_earned, 0) + v_def.diamond_reward;
      end if;

      perform public.insert_notification(
        v_uid, 'mission',
        'Mission Complete: ' || v_def.title,
        case when v_def.reward_type = 'xp_and_booster'
             then v_def.reward_label || ' — your XP Booster is ready!'
             else v_def.reward_label end,
        v_def.icon,
        jsonb_build_object(
          'mission_id', v_def.id,
          'reward_type', v_def.reward_type,
          'xp_reward', v_def.xp_reward,
          'diamond_reward', v_def.diamond_reward
        )
      );
    end if;
  end loop;

  update public.user_weekly_missions
     set progress = v_row.progress,
         completed_ids = v_row.completed_ids,
         total_xp_earned = v_row.total_xp_earned,
         total_diamonds_earned = v_row.total_diamonds_earned,
         boosters_earned = v_row.boosters_earned
   where id = v_row.id;

  return to_jsonb(v_row);
end;
$$;

revoke execute on function public.get_or_create_weekly_missions() from public, anon;
revoke execute on function public.record_mission_progress(text, integer, boolean) from public, anon;
grant execute on function public.get_or_create_weekly_missions() to authenticated;
grant execute on function public.record_mission_progress(text, integer, boolean) to authenticated;

-- ── 2. Tighten RLS ──────────────────────────────────────────────────────────
drop policy if exists "Users own their weekly missions" on public.user_weekly_missions;
create policy "Users can read their weekly missions"
  on public.user_weekly_missions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own transactions" on public.wallet_transactions;
drop policy if exists "Users can delete own transactions" on public.wallet_transactions;

-- ── 3. Protect privileged profile columns ──────────────────────────────────
create or replace function public.protect_privileged_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'authenticated' then
    if new.xp                       is distinct from old.xp
    or new.level                    is distinct from old.level
    or new.streak                   is distinct from old.streak
    or new.longest_streak           is distinct from old.longest_streak
    or new.last_streak_date         is distinct from old.last_streak_date
    or new.is_pro                   is distinct from old.is_pro
    or new.pro_tier                 is distinct from old.pro_tier
    or new.pro_billing_interval     is distinct from old.pro_billing_interval
    or new.pro_expires_at           is distinct from old.pro_expires_at
    or new.pro_cancel_at_period_end is distinct from old.pro_cancel_at_period_end
    or new.referral_code            is distinct from old.referral_code
    or new.referred_by              is distinct from old.referred_by
    or new.referral_completed       is distinct from old.referral_completed
    or new.referral_count           is distinct from old.referral_count
    or new.referral_tier_paid       is distinct from old.referral_tier_paid
    or new.staff_member_since       is distinct from old.staff_member_since
    or new.version_level            is distinct from old.version_level
    then
      raise exception 'privileged profile columns cannot be modified directly';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_privileged_profile_columns_trg on public.profiles;
create trigger protect_privileged_profile_columns_trg
  before update on public.profiles
  for each row execute function public.protect_privileged_profile_columns();
