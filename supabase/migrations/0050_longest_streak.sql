-- ── Track longest-ever streak ───────────────────────────────────────
-- No per-day check-in history exists to derive a true historical best
-- from, so this starts tracking from today: longest_streak seeds from
-- each player's current streak (so it reads sensibly immediately) and
-- update_streak() then keeps it as a running max on every check-in.

alter table public.profiles
  add column if not exists longest_streak int not null default 0;

update public.profiles
  set longest_streak = coalesce(streak, 0)
  where longest_streak = 0;

create or replace function public.update_streak(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_streak     int;
  v_last_date  date;
  v_today      date := (now() at time zone 'UTC')::date;
  v_new_streak int;
begin
  if auth.uid() <> p_user_id then
    raise exception 'not authorized';
  end if;

  select streak, last_streak_date into v_streak, v_last_date
    from profiles where id = p_user_id for update;

  if v_last_date = v_today then
    return;
  end if;

  if v_last_date = v_today - interval '1 day' then
    v_new_streak := coalesce(v_streak, 0) + 1;
  else
    v_new_streak := 1;
  end if;

  update profiles
    set streak = v_new_streak,
        last_streak_date = v_today,
        longest_streak = greatest(longest_streak, v_new_streak)
    where id = p_user_id;
end;
$$;
