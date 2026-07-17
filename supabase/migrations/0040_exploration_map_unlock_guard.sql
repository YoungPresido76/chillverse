-- supabase/migrations/0040_exploration_map_unlock_guard.sql
--
-- Server-side enforcement of the two map-unlock gates already shown in
-- the client (Exploration.tsx MapCard): an XP threshold and "previous
-- map fully explored." Until now these were client-only — the existing
-- RLS insert policy on exploration_chamber_runs only checks
-- `auth.uid() = user_id`, so a crafted request could start a chamber run
-- in a locked map. This migration closes that gap with a BEFORE INSERT
-- trigger; it does not touch UPDATE (the claim step) or any existing
-- policy/RPC.
--
-- exploration_map_config is a server-side mirror of the client's MAPS
-- array (xp_required, chamber count, and unlock chain). It's a real
-- table rather than a hardcoded CASE in the trigger so the two stay easy
-- to keep in sync — if the client's MAPS array ever changes, update this
-- table to match rather than editing function source. Values below match
-- MAPS in Exploration.tsx as of this migration (xp_required already
-- includes the +5%-per-map bump: 31500 / 94500 / 262500).

create table if not exists public.exploration_map_config (
  map_id         integer primary key,
  xp_required    integer not null default 0,
  total_chambers integer not null,
  prev_map_id    integer references public.exploration_map_config(map_id)
);

alter table public.exploration_map_config enable row level security;

create policy "anyone can read map config"
  on public.exploration_map_config for select
  using (true);
-- No insert/update/delete policy — config changes go through migrations
-- (service role), not client writes.

insert into public.exploration_map_config (map_id, xp_required, total_chambers, prev_map_id)
values
  (1, 0,      5, null),
  (2, 31500,  5, 1),
  (3, 94500,  5, 2),
  (4, 262500, 5, 3)
on conflict (map_id) do update
  set xp_required    = excluded.xp_required,
      total_chambers = excluded.total_chambers,
      prev_map_id    = excluded.prev_map_id;

create or replace function public.enforce_exploration_map_unlock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config       record;
  v_player_xp    integer;
  v_prev_config  record;
  v_prev_claimed integer;
begin
  select * into v_config
    from public.exploration_map_config
    where map_id = new.map_id;

  if v_config is null then
    raise exception 'unknown map_id %, refusing to start a chamber run', new.map_id;
  end if;

  if new.chamber_id < 1 or new.chamber_id > v_config.total_chambers then
    raise exception 'invalid chamber_id % for map_id %', new.chamber_id, new.map_id;
  end if;

  select xp into v_player_xp from public.profiles where id = new.user_id;
  if coalesce(v_player_xp, 0) < v_config.xp_required then
    raise exception 'insufficient XP for map_id % (have %, need %)',
      new.map_id, coalesce(v_player_xp, 0), v_config.xp_required;
  end if;

  if v_config.prev_map_id is not null then
    select * into v_prev_config
      from public.exploration_map_config
      where map_id = v_config.prev_map_id;

    select count(distinct chamber_id) into v_prev_claimed
      from public.exploration_chamber_runs
      where user_id = new.user_id
        and map_id = v_config.prev_map_id
        and claimed = true;

    if coalesce(v_prev_claimed, 0) < v_prev_config.total_chambers then
      raise exception 'map_id % locked — previous map % not fully explored (% of % chambers claimed)',
        new.map_id, v_config.prev_map_id, coalesce(v_prev_claimed, 0), v_prev_config.total_chambers;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_exploration_map_unlock on public.exploration_chamber_runs;
create trigger trg_enforce_exploration_map_unlock
  before insert on public.exploration_chamber_runs
  for each row
  execute function public.enforce_exploration_map_unlock();
