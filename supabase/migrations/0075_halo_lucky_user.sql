-- 0075_halo_lucky_user.sql
-- Lucky User of the Day (plan §4.5, item #10).
--
-- Winner selection is server-side and scheduled (never picked ad-hoc on
-- read — the plan explicitly flags that avoiding "everyone who loads first
-- wins" race conditions). pick_lucky_user() is SECURITY DEFINER and is
-- meant to be invoked once per day by a scheduler, not by client code.
--
-- Privacy default from the plan (§4.5): winners are NOT announced publicly.
-- get_daily_lucky_user() only ever returns a row to the winner themselves —
-- every other caller gets an empty result, so there is nothing to leak even
-- though the table itself holds one global row per day.
--
-- pg_cron availability was an open question for Zeus (plan §8) and is still
-- unconfirmed. The DO block below schedules the job IF pg_cron is already
-- enabled on this project, and simply raises a NOTICE (does not fail the
-- migration) if it isn't. If pg_cron isn't available on your plan, call
-- `select public.pick_lucky_user();` once a day from an external scheduler
-- instead (e.g. a Vercel Cron Job hitting a small edge function) — the SQL
-- function itself doesn't care who calls it.

create table if not exists public.lucky_user_of_the_day (
  pick_date date primary key,
  user_id uuid not null references public.profiles(id),
  xp_reward int not null,
  diamond_reward int not null,
  line_id uuid references public.halo_lines(id),
  claimed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.lucky_user_of_the_day enable row level security;

-- No client select/insert/update policy at all — every access goes through
-- the SECURITY DEFINER RPCs below, which is how a global one-row-per-day
-- table stays private to the single winner without per-row RLS trying (and
-- failing) to express "only the winner may read this shared row."

-- ── pick_lucky_user() ───────────────────────────────────────────────────
-- Idempotent per UTC-day via the primary key + ON CONFLICT DO NOTHING —
-- safe to invoke more than once without picking a second winner. Candidates
-- are restricted to accounts with recent activity (last_streak_date within
-- 3 days) so the pick doesn't land on a dormant account, per the plan.
create or replace function public.pick_lucky_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_uid uuid;
  v_line_id uuid;
  v_xp_reward int := 150;
  v_diamond_reward int := 40;
begin
  if exists (select 1 from public.lucky_user_of_the_day where pick_date = v_today) then
    return;
  end if;

  select id into v_uid
    from public.profiles
    where last_streak_date >= (v_today - interval '3 days')
    order by random()
    limit 1;

  if v_uid is null then
    -- No recently-active accounts (e.g. empty/dev database) — skip today
    -- rather than picking a dormant account or raising.
    return;
  end if;

  select gnl.id into v_line_id from public.get_next_halo_line('lucky_user') as gnl;

  insert into public.lucky_user_of_the_day
    (pick_date, user_id, xp_reward, diamond_reward, line_id)
  values (v_today, v_uid, v_xp_reward, v_diamond_reward, v_line_id)
  on conflict (pick_date) do nothing;
end;
$$;

-- Intentionally NOT granted to `authenticated` — this should only ever be
-- invoked by the scheduler (pg_cron runs as the migration/table owner) or
-- a service-role-authenticated edge function, never by a logged-in client.

-- ── get_daily_lucky_user() ───────────────────────────────────────────────
-- Read-only. Returns a row ONLY if the caller is today's winner — this is
-- what keeps the pick private without needing a per-row RLS policy.
create or replace function public.get_daily_lucky_user()
returns table(
  xp_reward int, diamond_reward int, claimed boolean, line_text text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  return query
    select l.xp_reward, l.diamond_reward, l.claimed, hl.text
    from public.lucky_user_of_the_day l
    left join public.halo_lines hl on hl.id = l.line_id
    where l.pick_date = v_today and l.user_id = v_uid;
end;
$$;

grant execute on function public.get_daily_lucky_user() to authenticated;

-- ── claim_lucky_user_reward() ────────────────────────────────────────────
create or replace function public.claim_lucky_user_reward()
returns table(xp_reward int, diamond_reward int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_row record;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_row from public.lucky_user_of_the_day
    where pick_date = v_today and user_id = v_uid
    for update;

  if not found then raise exception 'you are not today''s lucky user'; end if;
  if v_row.claimed then raise exception 'already claimed'; end if;

  update public.lucky_user_of_the_day set claimed = true
    where pick_date = v_today and user_id = v_uid;

  if v_row.xp_reward > 0 then
    update public.profiles
      set xp = xp + v_row.xp_reward,
          level = floor((xp + v_row.xp_reward) / 1000) + 1
      where id = v_uid;
  end if;

  if v_row.diamond_reward > 0 then
    insert into public.user_wallets (user_id, gem_balance)
      values (v_uid, v_row.diamond_reward)
      on conflict (user_id) do update
        set gem_balance = public.user_wallets.gem_balance + excluded.gem_balance,
            updated_at = now();
    insert into public.diamond_transactions (user_id, reference, amount, description)
      values (v_uid, 'halo_lucky_user:' || v_today, v_row.diamond_reward, 'Lucky User of the Day reward');
  end if;

  return query select v_row.xp_reward, v_row.diamond_reward;
end;
$$;

grant execute on function public.claim_lucky_user_reward() to authenticated;

-- ── Scheduling (best-effort — see header note) ───────────────────────────
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'halo-lucky-user-midnight',
      '0 0 * * *',
      $cron$select public.pick_lucky_user();$cron$
    );
  else
    raise notice 'pg_cron extension not found — pick_lucky_user() was NOT scheduled. Enable pg_cron in Database > Extensions, then re-run: select cron.schedule(''halo-lucky-user-midnight'', ''0 0 * * *'', ''select public.pick_lucky_user();''); or call pick_lucky_user() from an external daily scheduler instead.';
  end if;
end;
$$;
