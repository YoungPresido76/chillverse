-- 0079_halo_fortune_push.sql
--
-- Redesign per updated spec: Daily Fortune is no longer shown as an in-app
-- modal on load — it's delivered as a real push notification at a fixed
-- time each day. Reuses the existing pipeline entirely: any insert into
-- public.notifications already triggers a device push via a DB trigger →
-- send-push edge function (see src/features/notifications/push.ts) — the
-- same mechanism "Halo Saw That" already uses client-side. This just does
-- that insert server-side, on a schedule, for every user.
--
-- OPEN QUESTION (flagging rather than guessing silently): "9am" is user
-- local time in the ask, but no per-user timezone is tracked anywhere in
-- this schema today. This schedules at a single fixed 9am UTC for
-- everyone — that's 9am only for UTC-based users and some other hour for
-- everyone else. Add a `timezone` column to profiles and branch the loop
-- on it if per-user local delivery actually matters; flagging it here
-- rather than quietly picking a wrong assumption.

create or replace function public.send_daily_fortune_notifications()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_user record;
  v_line_id uuid;
  v_line_text text;
begin
  for v_user in
    select p.id from public.profiles p
    where not exists (
      select 1 from public.daily_fortune df
      where df.user_id = p.id and df.fortune_date = v_today
    )
  loop
    select gnl.id, gnl.text into v_line_id, v_line_text
      from public.get_next_halo_line('fortune', v_user.id) as gnl;

    if v_line_id is null then
      -- No fortune lines seeded yet — skip this user rather than failing
      -- the whole batch (scripts/seed-halo-lines.ts needs to have run).
      continue;
    end if;

    insert into public.daily_fortune (user_id, fortune_date, line_id)
      values (v_user.id, v_today, v_line_id)
      on conflict (user_id, fortune_date) do nothing;

    insert into public.notifications (user_id, type, title, body, icon)
      values (v_user.id, 'halo', v_line_text, 'Chillverse Fortune', 'sparkles');
  end loop;
end;
$$;

-- Intentionally NOT granted to `authenticated` — scheduler-only, same as
-- pick_lucky_user() in 0075.

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'halo-daily-fortune-9am',
      '0 9 * * *',
      $cron$select public.send_daily_fortune_notifications();$cron$
    );
  else
    raise notice 'pg_cron extension not found — daily fortune push was NOT scheduled. Enable pg_cron in Database > Extensions, then: select cron.schedule(''halo-daily-fortune-9am'', ''0 9 * * *'', ''select public.send_daily_fortune_notifications();''); or call it from an external daily scheduler instead.';
  end if;
end;
$$;
