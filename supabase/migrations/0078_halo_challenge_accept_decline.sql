-- 0078_halo_challenge_accept_decline.sql
--
-- Redesign per updated spec: Halo's Daily Challenge is now offered via its
-- own modal on first login — the user explicitly accepts or declines, full
-- stop. Progress should only ever accrue for a challenge the user actually
-- accepted, and a declined challenge shouldn't reappear or nag for the rest
-- of the day. Re-defines the existing functions (CREATE OR REPLACE) rather
-- than touching 0068, since 0068 may already be applied.

alter table public.halo_daily_challenge
  add column if not exists status text not null default 'offered'
    check (status in ('offered', 'accepted', 'declined'));

-- get_or_create_halo_challenge() now also returns status, unchanged otherwise.
create or replace function public.get_or_create_halo_challenge()
returns table(
  challenge_key text, target_value int, progress int, completed boolean,
  claimed boolean, xp_reward int, diamond_reward int, intro_text text, status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_roll numeric;
  v_challenge_key text;
  v_target int;
  v_xp int;
  v_diamonds int;
  v_intro_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  return query
    select hdc.challenge_key, hdc.target_value, hdc.progress, hdc.completed,
           hdc.claimed, hdc.xp_reward, hdc.diamond_reward, hl.text, hdc.status
    from public.halo_daily_challenge hdc
    left join public.halo_lines hl on hl.id = hdc.intro_line_id
    where hdc.user_id = v_uid and hdc.challenge_date = v_today;

  if found then
    return;
  end if;

  v_roll := random();
  if v_roll < 0.34 then
    v_challenge_key := 'xp_earned';   v_target := 200; v_xp := 30; v_diamonds := 15;
  elsif v_roll < 0.67 then
    v_challenge_key := 'games_today'; v_target := 3;   v_xp := 40; v_diamonds := 10;
  else
    v_challenge_key := 'games_won';   v_target := 2;   v_xp := 50; v_diamonds := 20;
  end if;

  select gnl.id into v_intro_id from public.get_next_halo_line('challenge_intro') as gnl;

  insert into public.halo_daily_challenge
    (user_id, challenge_date, challenge_key, target_value, xp_reward, diamond_reward, intro_line_id)
  values (v_uid, v_today, v_challenge_key, v_target, v_xp, v_diamonds, v_intro_id)
  on conflict (user_id, challenge_date) do nothing;

  return query
    select hdc.challenge_key, hdc.target_value, hdc.progress, hdc.completed,
           hdc.claimed, hdc.xp_reward, hdc.diamond_reward, hl.text, hdc.status
    from public.halo_daily_challenge hdc
    left join public.halo_lines hl on hl.id = hdc.intro_line_id
    where hdc.user_id = v_uid and hdc.challenge_date = v_today;
end;
$$;

grant execute on function public.get_or_create_halo_challenge() to authenticated;

-- ── respond_halo_challenge() ─────────────────────────────────────────────
-- Called when the user taps Accept/Decline in HaloChallengeModal. Only
-- moves 'offered' → 'accepted'/'declined' — already-responded challenges
-- (e.g. a double-tap or a second tab) are a no-op, not an error.
create or replace function public.respond_halo_challenge(p_accept boolean)
returns void
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

  update public.halo_daily_challenge
    set status = case when p_accept then 'accepted' else 'declined' end
    where user_id = v_uid and challenge_date = v_today and status = 'offered';
end;
$$;

grant execute on function public.respond_halo_challenge(boolean) to authenticated;

-- record_halo_challenge_progress() now also requires status = 'accepted' —
-- a declined or not-yet-responded-to challenge should never silently rack
-- up progress in the background.
create or replace function public.record_halo_challenge_progress(
  p_metric_key text, p_increment int, p_absolute boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_row record;
  v_amount int;
  v_new_progress int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_row from public.halo_daily_challenge
    where user_id = v_uid and challenge_date = v_today
    for update;

  if not found or v_row.status <> 'accepted' or v_row.completed or v_row.challenge_key <> p_metric_key then
    return;
  end if;

  if p_absolute then
    v_amount := least(greatest(coalesce(p_increment, 0), 0), 3650);
    v_new_progress := greatest(v_row.progress, v_amount);
  else
    v_amount := least(greatest(coalesce(p_increment, 0), 0), 50);
    v_new_progress := v_row.progress + v_amount;
  end if;

  update public.halo_daily_challenge
    set progress = v_new_progress,
        completed = (v_new_progress >= v_row.target_value)
    where user_id = v_uid and challenge_date = v_today;

  if v_new_progress >= v_row.target_value then
    insert into public.notifications (user_id, type, title, body, icon)
      values (v_uid, 'halo', 'Halo Challenge complete!', 'Your challenge is done — head back to claim it.', 'sparkles');
  end if;
end;
$$;

grant execute on function public.record_halo_challenge_progress(text, int, boolean) to authenticated;
