-- ═══════════════════════════════════════════════════════════════
-- 0004_multiplayer_tables.sql
-- Multiplayer: game_rooms, room_players, room_messages
-- + RLS policies + password-validation RPC
-- ═══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────
-- 1. TABLES
-- ──────────────────────────────────────────

create table if not exists game_rooms (
  id                 uuid        primary key default gen_random_uuid(),
  game_id            text        not null,
  room_name          text        not null,
  host_id            uuid        not null references auth.users(id),
  is_private         boolean     not null default false,
  password_hash      text,                             -- null if public; bcrypt hash
  status             text        not null default 'waiting'
                                check (status in ('waiting','countdown','in_progress','completed')),
  max_player_count   int         not null,
  min_player_count   int         not null,
  current_player_count int       not null default 1,
  team_mode          text        check (team_mode in ('ffa','2v2')),
  countdown_start_at timestamptz,
  created_at         timestamptz not null default now()
);

create table if not exists room_players (
  room_id    uuid        not null references game_rooms(id) on delete cascade,
  player_id  uuid        not null references auth.users(id),
  team       text        check (team in ('A','B')),
  is_host    boolean     not null default false,
  joined_at  timestamptz not null default now(),
  primary key (room_id, player_id)
);

create table if not exists room_messages (
  id         uuid        primary key default gen_random_uuid(),
  room_id    uuid        not null references game_rooms(id) on delete cascade,
  player_id  uuid        not null references auth.users(id),
  message    text        not null,
  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────
-- 2. INDEXES
-- ──────────────────────────────────────────

create index if not exists idx_game_rooms_status       on game_rooms(status);
create index if not exists idx_game_rooms_created_at   on game_rooms(created_at);
create index if not exists idx_room_players_room_id    on room_players(room_id);
create index if not exists idx_room_messages_room_id   on room_messages(room_id);
create index if not exists idx_room_messages_created   on room_messages(created_at);

-- ──────────────────────────────────────────
-- 3. ROW LEVEL SECURITY
-- ──────────────────────────────────────────

alter table game_rooms     enable row level security;
alter table room_players   enable row level security;
alter table room_messages  enable row level security;

-- ── game_rooms ──

-- Any authenticated user can see public waiting rooms
create policy "Public rooms are visible"
  on game_rooms for select
  to authenticated
  using (
    is_private = false
    or host_id = auth.uid()
    or exists (
      select 1 from room_players
      where room_players.room_id = game_rooms.id
        and room_players.player_id = auth.uid()
    )
  );

-- Only the host may insert (they are the creator)
create policy "Host can insert room"
  on game_rooms for insert
  to authenticated
  with check (host_id = auth.uid());

-- Only the host may update room metadata / status
create policy "Host can update room"
  on game_rooms for update
  to authenticated
  using (host_id = auth.uid());

-- Host can delete (cleanup)
create policy "Host can delete room"
  on game_rooms for delete
  to authenticated
  using (host_id = auth.uid());

-- ── room_players ──

-- Members can see who is in any room they belong to; non-members see public-room players
create policy "Room players visible to members"
  on room_players for select
  to authenticated
  using (
    exists (
      select 1 from game_rooms gr
      where gr.id = room_players.room_id
        and (
          gr.is_private = false
          or gr.host_id = auth.uid()
          or room_players.player_id = auth.uid()
        )
    )
  );

-- A player may only insert themselves
create policy "Player inserts self"
  on room_players for insert
  to authenticated
  with check (player_id = auth.uid());

-- A player may update only their own row (team selection)
create policy "Player updates self"
  on room_players for update
  to authenticated
  using (player_id = auth.uid());

-- A player may remove themselves
create policy "Player deletes self"
  on room_players for delete
  to authenticated
  using (player_id = auth.uid());

-- ── room_messages ──

-- Only room members can read messages
create policy "Room members can read messages"
  on room_messages for select
  to authenticated
  using (
    exists (
      select 1 from room_players rp
      where rp.room_id = room_messages.room_id
        and rp.player_id = auth.uid()
    )
  );

-- Only room members can post messages
create policy "Room members can insert messages"
  on room_messages for insert
  to authenticated
  with check (
    player_id = auth.uid()
    and exists (
      select 1 from room_players rp
      where rp.room_id = room_messages.room_id
        and rp.player_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────
-- 4. HELPER: auto-update current_player_count
-- ──────────────────────────────────────────

create or replace function sync_room_player_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update game_rooms
       set current_player_count = (
             select count(*) from room_players where room_id = NEW.room_id
           )
     where id = NEW.room_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    -- If the room is now empty and still 'waiting', delete it
    if (select count(*) from room_players where room_id = OLD.room_id) = 0 then
      delete from game_rooms where id = OLD.room_id and status = 'waiting';
    else
      update game_rooms
         set current_player_count = (
               select count(*) from room_players where room_id = OLD.room_id
             )
       where id = OLD.room_id;
    end if;
    return OLD;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_player_count on room_players;
create trigger trg_sync_player_count
  after insert or delete on room_players
  for each row execute function sync_room_player_count();

-- ──────────────────────────────────────────
-- 5. RPC: join_private_room
-- Validates password server-side (never exposes hash to client)
-- ──────────────────────────────────────────

create or replace function join_private_room(
  p_room_id  uuid,
  p_password text
)
returns json language plpgsql security definer as $$
declare
  v_room      game_rooms%rowtype;
  v_count     int;
begin
  -- Fetch room
  select * into v_room from game_rooms where id = p_room_id;
  if not found then
    return json_build_object('ok', false, 'error', 'Room not found');
  end if;

  -- Check status
  if v_room.status <> 'waiting' then
    return json_build_object('ok', false, 'error', 'Room is no longer accepting players');
  end if;

  -- Check capacity
  if v_room.current_player_count >= v_room.max_player_count then
    return json_build_object('ok', false, 'error', 'Room is full');
  end if;

  -- Verify password using pgcrypto crypt()
  if v_room.password_hash is not null then
    if crypt(p_password, v_room.password_hash) <> v_room.password_hash then
      return json_build_object('ok', false, 'error', 'Incorrect password');
    end if;
  end if;

  -- Check already a member
  if exists (select 1 from room_players where room_id = p_room_id and player_id = auth.uid()) then
    return json_build_object('ok', true, 'already_member', true);
  end if;

  -- Insert player
  insert into room_players (room_id, player_id, is_host)
  values (p_room_id, auth.uid(), false);

  return json_build_object('ok', true, 'already_member', false);
end;
$$;

-- ──────────────────────────────────────────
-- 6. Edge-function hook: hash_room_password
-- NOTE: password hashing MUST be done before insert via the
--       Edge Function or client-side bcryptjs.  The RPC above
--       uses pgcrypto's crypt() which expects a hash already
--       stored in password_hash. The Edge Function
--       (supabase/functions/hash-room-password/index.ts)
--       should call crypt(password, gen_salt('bf')) before
--       inserting game_rooms. This comment acts as the contract.
-- ──────────────────────────────────────────

-- Enable pgcrypto if not already enabled
create extension if not exists pgcrypto;

-- ──────────────────────────────────────────
-- 7. Scheduled cleanup: expire stale waiting rooms (150s)
-- Run this via pg_cron or a Supabase Edge Function cron.
-- SQL logic shown here for reference / manual execution:
-- ──────────────────────────────────────────

-- delete from game_rooms
-- where status = 'waiting'
--   and created_at < now() - interval '150 seconds';
-- (cascade deletes room_players + room_messages automatically)

-- Realtime: enable on all three tables
alter publication supabase_realtime add table game_rooms;
alter publication supabase_realtime add table room_players;
alter publication supabase_realtime add table room_messages;
