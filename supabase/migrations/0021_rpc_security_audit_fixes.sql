-- supabase/migrations/0021_rpc_security_audit_fixes.sql
--
-- Full audit of every SECURITY DEFINER function exposed to anon/authenticated
-- via PostgREST (triggered by the advisor warnings surfaced after the DM fix).
-- Findings below, ordered by severity. Anything not mentioned here was
-- checked and is already correctly scoped (e.g. apply_referral_code,
-- complete_referral, get_exploration_energy, purchase_mall_item,
-- spend_exploration_energy, send_gift, create_room, join_room_by_code,
-- kick_player, leave_room, start_room, pk_begin_match, pk_pick, pk_start,
-- pk_timeout, tac_move, tac_start — all already check auth.uid() correctly
-- against the acting player, or don't need to).
--
-- CRITICAL — actively exploitable, actively used by the app:
--  1. increment_session_count had NO auth.uid() check and trusted a
--     client-supplied p_by (including negative numbers). Any signed-in
--     player could call this directly with someone else's id, or with a
--     negative p_by on their own id, to erase their own daily session
--     count — a complete bypass of the Free/Orbit/Void session-limit
--     paywall this whole feature exists to enforce.
--  2. upgrade_version checked auth.uid() correctly but trusted a
--     client-supplied p_cost with zero server-side validation — anyone
--     could call it with p_cost = 1 and upgrade to any Version tier for
--     a single diamond instead of the real 1900/3900/5900 price.
--  3. award_xp(p_user_id, p_xp) checked auth.uid() correctly but placed no
--     bound on p_xp — a signed-in player could self-award unlimited XP,
--     undermining ranks, leaderboards, and the Gold-rank posting gate.
--  4. pk_end_game had NO auth.uid() check at all and trusted client-
--     supplied p_winner/p_loser — anyone could call it directly to declare
--     themselves the winner of any live Pattern King match for free XP,
--     or end a match that isn't theirs.
--
-- MEDIUM — real gaps, lower blast radius:
--  5. insert_notification had no auth requirement and accepted an
--     arbitrary p_type/title/body — any anon request could spam fabricated
--     notifications to any player. Now requires auth and a known p_type.
--     Note: this still can't fully stop an authenticated user crafting a
--     fake-looking notification with real title/body text for a known
--     legitimate type (e.g. a fake 'gift'); properly closing that needs
--     the triggering logic to move server-side (DB triggers) instead of
--     being client-invoked. Flagging as a follow-up, not fixed here.
--  6. update_streak had no auth.uid() check and no verification a game
--     was actually completed — anyone could inflate/maintain any player's
--     streak without playing.
--  7. get_session_info / check_posting_eligibility had no auth.uid()
--     check — anyone could read another player's session/XP/rank status.
--     Low-severity info leaks, fixed for defense in depth.
--
-- CLEANUP — unused, no current client dependency:
--  8. create_dm(target_user_id) is the pre-migration-0011 legacy DM
--     creator: no existing-room check (creates a duplicate DM room every
--     call) and no longer referenced anywhere in the client. Dropped.
--  9. increment_halo_count(p_user_id, p_today) is not called from any
--     client or edge function in this repo. EXECUTE revoked rather than
--     dropped, in case Halo AI's edge function is meant to call it later.
-- 10. All 0-argument trigger functions (award_xp(), block_wishlist_if_owned,
--     handle_*, log_call_message, remove_wishlist_on_acquire,
--     set_reaction_room_id, enforce_report_rate_limit,
--     enforce_voice_note_pro_gate) reference NEW/OLD and simply error if
--     invoked directly via RPC — not exploitable, but EXECUTE is revoked
--     from anon/authenticated anyway so they stop showing up as attack
--     surface and match least-privilege.

-- ── 1. increment_session_count ──────────────────────────────────
create or replace function public.increment_session_count(
  p_user_id uuid, p_by integer default 1, p_limit integer default 15, p_cooldown_hours numeric default 4.5
)
returns table (count integer, reset_at timestamptz, limit_reached boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.session_limits;
  v_new_count integer;
  v_new_reset timestamptz;
  v_safe_by integer;
begin
  if auth.uid() <> p_user_id then
    raise exception 'not authorized';
  end if;
  v_safe_by := greatest(p_by, 0); -- block negative p_by from resetting the counter

  insert into public.session_limits (user_id, count, reset_at, last_date)
    values (p_user_id, 0, null, current_date)
    on conflict (user_id) do nothing;

  select * into v_row from public.session_limits where user_id = p_user_id for update;

  if v_row.last_date <> current_date then
    v_row.count := 0;
    v_row.reset_at := null;
    v_row.last_date := current_date;
  end if;

  if v_row.reset_at is not null and v_row.reset_at <= now() then
    v_row.count := 0;
    v_row.reset_at := null;
  end if;

  v_new_count := v_row.count + v_safe_by;
  v_new_reset := v_row.reset_at;
  if v_new_count >= p_limit and v_row.reset_at is null then
    v_new_reset := now() + (p_cooldown_hours || ' hours')::interval;
  end if;

  update public.session_limits
    set count = v_new_count, reset_at = v_new_reset, last_date = current_date, updated_at = now()
    where user_id = p_user_id;

  return query select v_new_count, v_new_reset, (v_new_count >= p_limit);
end;
$$;

-- ── 2. upgrade_version ──────────────────────────────────────────
-- p_cost is now ignored; the real price is looked up server-side and the
-- caller is charged that, exactly like send_gift already does correctly.
create or replace function public.upgrade_version(p_user_id uuid, p_cost integer, p_target_level integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_level int;
  v_real_cost int;
  v_updated int;
begin
  if auth.uid() <> p_user_id then
    raise exception 'not authorized';
  end if;

  select version_level into v_current_level from profiles where id = p_user_id;
  if coalesce(v_current_level, 0) + 1 <> p_target_level then
    raise exception 'version_mismatch';
  end if;

  -- keep in sync with VERSIONS[].cost in src/features/marketing/Version.tsx
  v_real_cost := case p_target_level
    when 2 then 1900
    when 3 then 3900
    when 4 then 5900
    else null
  end;
  if v_real_cost is null then
    raise exception 'target_level_not_purchasable';
  end if;

  update user_wallets
  set gem_balance = gem_balance - v_real_cost
  where user_id = p_user_id and gem_balance >= v_real_cost;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'insufficient_funds';
  end if;

  update profiles set version_level = p_target_level where id = p_user_id;

  insert into diamond_transactions (user_id, amount, description)
  values (p_user_id, -v_real_cost, 'Version upgrade to level ' || p_target_level);
end;
$$;

-- ── 3. award_xp(p_user_id, p_xp) ────────────────────────────────
-- Bounded to the highest legitimate single-call reward in the app today
-- (the top exploration chamber, 15,000 XP) with headroom. This narrows
-- "unlimited free XP" down to "bounded per call" — fully closing this
-- would mean moving reward amounts server-side per source (exploration
-- chamber id, mission id, game id) instead of trusting the client's
-- number at all, which is a larger refactor than an audit-and-patch pass.
create or replace function public.award_xp(p_user_id uuid, p_xp integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_safe_xp int;
begin
  if auth.uid() <> p_user_id then
    raise exception 'not authorized';
  end if;
  v_safe_xp := least(greatest(p_xp, 0), 20000);

  update public.profiles
    set xp = xp + v_safe_xp,
        level = floor((xp + v_safe_xp) / 1000) + 1
    where id = p_user_id;
end;
$$;

revoke execute on function public.award_xp() from anon, authenticated;

-- ── 4. pk_end_game ───────────────────────────────────────────────
-- Now verifies the caller is actually one of the two players in this
-- room's live game_state, and that p_winner/p_loser are exactly those two
-- players (not arbitrary ids) — matching the authorization style already
-- used by pk_pick/pk_timeout, which call this internally.
create or replace function public.pk_end_game(p_room_id uuid, p_winner uuid, p_loser uuid, p_rounds_completed integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room   rooms%rowtype;
  v_players jsonb;
  v_p0 uuid;
  v_p1 uuid;
  v_win_xp  int;
  v_lose_xp int;
  v_dur     int;
begin
  select * into v_room from rooms where id = p_room_id for update;
  if not found then raise exception 'Room not found'; end if;

  v_players := v_room.game_state->'players';
  v_p0 := (v_players->>0)::uuid;
  v_p1 := (v_players->>1)::uuid;

  if auth.uid() <> v_p0 and auth.uid() <> v_p1 then
    raise exception 'Not a player in this room';
  end if;
  if not ((p_winner = v_p0 and p_loser = v_p1) or (p_winner = v_p1 and p_loser = v_p0)) then
    raise exception 'winner/loser must be the two players in this room';
  end if;

  if v_room.game_state->>'winner' is not null or v_room.game_state->>'loser' is not null then
    return; -- already resolved
  end if;

  v_win_xp  := least(80 + p_rounds_completed * 40, 500);
  v_lose_xp := least(20 + p_rounds_completed * 15, 200);
  v_dur := greatest(0, extract(epoch from (now() - (v_room.game_state->>'started_at')::timestamptz))::int);

  insert into game_sessions (user_id, game, score, xp_earned, duration_sec, metadata, result) values
    (p_winner, 'pattern_king', p_rounds_completed * 10, v_win_xp,  v_dur, jsonb_build_object('multiplayer',true,'room_id',p_room_id,'opponent',p_loser,'outcome','win'),  'completed'),
    (p_loser,  'pattern_king', p_rounds_completed * 10, v_lose_xp, v_dur, jsonb_build_object('multiplayer',true,'room_id',p_room_id,'opponent',p_winner,'outcome','loss'), 'completed');
  update profiles set level = floor(xp / 1000) + 1 where id in (p_winner, p_loser);

  update rooms set
    game_state = v_room.game_state || jsonb_build_object('winner', p_winner, 'loser', p_loser, 'phase', 'done'),
    turn_user_id = null
  where id = p_room_id;
end;
$$;

-- ── 5. insert_notification ──────────────────────────────────────
create or replace function public.insert_notification(
  p_user_id uuid, p_type text, p_title text, p_body text, p_icon text, p_meta jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authorized';
  end if;
  if p_type not in (
    'new_post','post_tag','highlight_posted','session_reset','movies_open',
    'follow','profile_view','profile_like','message','missed_call','rank_up',
    'followed_rank_up','streak','referral_milestone','referral_completed','gift'
  ) then
    raise exception 'invalid notification type';
  end if;

  insert into notifications(user_id, type, title, body, icon, meta)
    values (p_user_id, p_type, p_title, p_body, p_icon, p_meta);
end;
$$;

-- ── 6. update_streak ─────────────────────────────────────────────
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

  update profiles set streak = v_new_streak, last_streak_date = v_today where id = p_user_id;
end;
$$;

-- ── 7. get_session_info / check_posting_eligibility ─────────────
create or replace function public.get_session_info(p_user_id uuid)
returns table (count integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.session_limits;
begin
  if auth.uid() <> p_user_id then
    raise exception 'not authorized';
  end if;

  insert into public.session_limits (user_id, count, reset_at, last_date)
    values (p_user_id, 0, null, current_date)
    on conflict (user_id) do nothing;

  select * into v_row from public.session_limits where user_id = p_user_id;

  if v_row.last_date <> current_date then
    return query select 0, null::timestamptz;
    return;
  end if;
  if v_row.reset_at is not null and v_row.reset_at <= now() then
    return query select 0, null::timestamptz;
    return;
  end if;

  return query select v_row.count, v_row.reset_at;
end;
$$;

create or replace function public.check_posting_eligibility(p_user_id uuid)
returns table (
  eligible boolean, is_gold_rank boolean, games_completed int, games_required int, has_profile_pic boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_xp int;
  v_avatar text;
  v_games int;
  v_gold_xp constant int := 63000;
  v_games_required constant int := 150;
begin
  if auth.uid() <> p_user_id then
    raise exception 'not authorized';
  end if;

  select xp, avatar into v_xp, v_avatar from public.profiles where id = p_user_id;
  select count(*) into v_games from public.game_sessions where user_id = p_user_id and result = 'completed';

  return query select
    (coalesce(v_xp, 0) >= v_gold_xp) and (coalesce(v_games, 0) >= v_games_required) and (v_avatar is not null and v_avatar like 'http%'),
    coalesce(v_xp, 0) >= v_gold_xp,
    coalesce(v_games, 0),
    v_games_required,
    (v_avatar is not null and v_avatar like 'http%');
end;
$$;

-- ── 8. create_dm — legacy, superseded, unused: drop ─────────────
drop function if exists public.create_dm(uuid);

-- ── 9. increment_halo_count — unused anywhere in this repo ──────
revoke execute on function public.increment_halo_count(uuid, date) from anon, authenticated;

-- ── 10. Trigger-only functions: revoke direct PostgREST access ──
revoke execute on function public.block_wishlist_if_owned() from anon, authenticated;
revoke execute on function public.handle_highlight_like_change() from anon, authenticated;
revoke execute on function public.handle_new_profile_referral_code() from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.handle_new_user_global_chat() from anon, authenticated;
revoke execute on function public.handle_post_comment_change() from anon, authenticated;
revoke execute on function public.handle_post_like_change() from anon, authenticated;
revoke execute on function public.log_call_message() from anon, authenticated;
revoke execute on function public.remove_wishlist_on_acquire() from anon, authenticated;
revoke execute on function public.set_reaction_room_id() from anon, authenticated;
revoke execute on function public.enforce_report_rate_limit() from anon, authenticated;
revoke execute on function public.enforce_voice_note_pro_gate() from anon, authenticated;

-- Revoke anon entirely on everything that now requires a real signed-in
-- caller — the internal auth.uid() checks already block anon (auth.uid()
-- is null for anon), but removing the grant closes it at the permission
-- layer too rather than relying solely on the function body.
revoke execute on function public.increment_session_count(uuid, integer, integer, numeric) from anon;
revoke execute on function public.upgrade_version(uuid, integer, integer) from anon;
revoke execute on function public.award_xp(uuid, integer) from anon;
revoke execute on function public.pk_end_game(uuid, uuid, uuid, integer) from anon;
revoke execute on function public.insert_notification(uuid, text, text, text, text, jsonb) from anon;
revoke execute on function public.update_streak(uuid) from anon;
revoke execute on function public.get_session_info(uuid) from anon;
revoke execute on function public.check_posting_eligibility(uuid) from anon;

-- Re-grant execute on everything meant to stay callable, since
-- CREATE OR REPLACE preserves existing grants but we're being explicit here
-- for the functions we just redefined.
grant execute on function public.increment_session_count(uuid, integer, integer, numeric) to authenticated;
grant execute on function public.upgrade_version(uuid, integer, integer) to authenticated;
grant execute on function public.award_xp(uuid, integer) to authenticated;
grant execute on function public.pk_end_game(uuid, uuid, uuid, integer) to authenticated;
grant execute on function public.insert_notification(uuid, text, text, text, text, jsonb) to authenticated;
grant execute on function public.update_streak(uuid) to authenticated;
grant execute on function public.get_session_info(uuid) to authenticated;
grant execute on function public.check_posting_eligibility(uuid) to authenticated;

notify pgrst, 'reload schema';
