-- 0077_halo_moments_foundation.sql
--
-- Every migration from 0065 onward calls public.get_next_halo_line(...) and
-- assumes public.halo_lines / public.halo_line_history already exist — they
-- were supposed to ship in 0063/0064 per the original plan, but those files
-- were never actually created in this repo. That means EVERY halo-moments
-- RPC (fortune, mystery box, challenge intro, lucky user) has been failing
-- at the database level this whole time — this is almost certainly the
-- real root cause behind "nothing shows up," independent of any client bug
-- fixed earlier in this thread.
--
-- Written idempotently (`if not exists` / `create or replace`) so it's safe
-- to run regardless of what has or hasn't partially landed already.

create table if not exists public.halo_lines (
  id uuid primary key default gen_random_uuid(),
  moment_type text not null check (moment_type in (
    'fortune', 'mystery_box_win', 'mystery_box_empty', 'streak_milestone',
    'challenge_intro', 'halo_saw_that', 'random_surprise', 'lucky_user',
    'inactivity_nudge'
  )),
  text text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists halo_lines_moment_type_idx on public.halo_lines(moment_type) where is_active;

alter table public.halo_lines enable row level security;
drop policy if exists "Anyone can read active halo lines" on public.halo_lines;
create policy "Anyone can read active halo lines" on public.halo_lines
  for select to authenticated using (is_active);
-- No insert/update/delete policy — lines are seeded via the one-off script
-- (service role) or the SQL editor, never by client code.

create table if not exists public.halo_line_history (
  user_id uuid not null references public.profiles(id) on delete cascade,
  moment_type text not null,
  line_id uuid not null references public.halo_lines(id),
  shown_at timestamptz not null default now(),
  primary key (user_id, moment_type)
);
alter table public.halo_line_history enable row level security;
-- No client policy at all — only ever written by get_next_halo_line() below
-- (SECURITY DEFINER), never read or written directly by client code.

-- ── get_next_halo_line() ─────────────────────────────────────────────────
-- Picks one active line for a moment type, excluding whichever line this
-- user was shown last for that type (so it doesn't repeat back-to-back),
-- and records the pick. p_user_id defaults to null so callers running
-- outside a normal authenticated request (e.g. pick_lucky_user() from a
-- cron job, where auth.uid() is null) can still get a line back — they
-- just don't get per-user anti-repeat tracking for that call.
create or replace function public.get_next_halo_line(
  p_moment_type text, p_user_id uuid default null
)
returns table(id uuid, text text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := coalesce(p_user_id, auth.uid());
  v_last_line_id uuid;
  v_picked_id uuid;
  v_picked_text text;
begin
  if v_uid is not null then
    select hlh.line_id into v_last_line_id
      from public.halo_line_history hlh
      where hlh.user_id = v_uid and hlh.moment_type = p_moment_type;
  end if;

  select hl.id, hl.text into v_picked_id, v_picked_text
    from public.halo_lines hl
    where hl.moment_type = p_moment_type and hl.is_active
      and (v_last_line_id is null or hl.id <> v_last_line_id)
    order by random()
    limit 1;

  if v_picked_id is null then
    -- Pool empty (not seeded yet) or only the just-shown line exists —
    -- return zero rows rather than erroring, callers already handle a
    -- null/empty pick gracefully.
    return;
  end if;

  if v_uid is not null then
    insert into public.halo_line_history (user_id, moment_type, line_id, shown_at)
      values (v_uid, p_moment_type, v_picked_id, now())
      on conflict (user_id, moment_type) do update
        set line_id = excluded.line_id, shown_at = excluded.shown_at;
  end if;

  return query select v_picked_id, v_picked_text;
end;
$$;

grant execute on function public.get_next_halo_line(text, uuid) to authenticated;

-- Sanity check you can run manually after applying this + the seed script:
--   select moment_type, count(*) from public.halo_lines group by 1;
-- If every row shows 0, the seed script (scripts/seed-halo-lines.ts) still
-- needs to be run against a real OpenRouter key — the tables/function
-- existing isn't enough on its own, they need content in them.
