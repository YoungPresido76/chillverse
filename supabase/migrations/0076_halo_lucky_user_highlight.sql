-- 0076_halo_lucky_user_highlight.sql
--
-- Adds public recognition for the Lucky User of the Day (follow-up to
-- 0075, which shipped the pick private-by-default per the plan's default).
-- Re-defines pick_lucky_user() rather than editing 0075 in place, since
-- 0075 may already be applied to the live project.
--
-- The highlight is inserted directly inside pick_lucky_user() itself
-- (SECURITY DEFINER, bypasses RLS) rather than from the client: the pick
-- happens on a schedule with no client present at that moment, unlike
-- every other highlight kind which is inserted by the client when the
-- triggering user is actually in the app (see highlights.ts / createHighlight).
-- dedup_key keeps a second cron run on the same day from double-posting,
-- same guard style as the other "once ever" highlight kinds (xp_milestone,
-- streak_milestone, map_complete, leaderboard_badge — migration 0036).

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

  -- Public recognition (plan §4.5 nice-to-have, now in scope): posts to the
  -- same feed as every other achievement highlight.
  insert into public.highlights
    (author_id, kind, game_key, body, value, map_id, badge_id, dedup_key)
  values
    (v_uid, 'lucky_user', null, 'Chosen by Halo as today''s Lucky User!', v_xp_reward, null, null, 'lucky_user:' || v_today)
  on conflict (author_id, dedup_key) do nothing;
end;
$$;
