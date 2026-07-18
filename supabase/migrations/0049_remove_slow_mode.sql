-- supabase/migrations/0049_remove_slow_mode.sql
-- ════════════════════════════════════════════════════════════════════════
-- Migration 0049 — Remove Slow Mode entirely
--
-- Slow Mode (originally added alongside Spotlight, later patched into a
-- SECURITY DEFINER helper is_slow_mode_blocked() to fix messages-insert
-- policy recursion) is being fully removed per product decision. Spotlight
-- is untouched — this only touches the slow_mode / slow_mode_seconds
-- columns, their check constraint, the is_slow_mode_blocked() helper, and
-- the AND clause in "members can send messages" that called it.
--
-- NOTE: this was written and applied against the live database's actual
-- current policy definition (checked via pg_policy), not against this
-- repo's own older migration files — the two had drifted out of sync
-- (e.g. this repo's numbering was reused/renumbered at some point and no
-- longer matches what's actually deployed). Every other clause in the
-- rebuilt policy below is unchanged from what was live.
-- ════════════════════════════════════════════════════════════════════════

drop policy if exists "members can send messages" on public.messages;
create policy "members can send messages" on public.messages
  for insert with check (
    auth.uid() = sender_id
    and is_room_member(room_id)
    and not is_currently_banned(auth.uid())
    and type <> 'poll'
    and (
      type <> 'rank_tag'
      or (
        is_staff(auth.uid())
        and exists (select 1 from public.chat_rooms cr where cr.id = messages.room_id and cr.type = 'global')
      )
    )
    and not exists (
      select 1
      from public.room_members rm
      join public.chat_rooms cr on cr.id = rm.room_id
      join public.blocks b
        on (b.blocker_id = rm.user_id and b.blocked_id = auth.uid())
        or (b.blocker_id = auth.uid() and b.blocked_id = rm.user_id)
      where rm.room_id = messages.room_id
        and rm.user_id <> auth.uid()
        and cr.type = 'dm'
    )
  );

drop function if exists public.is_slow_mode_blocked(uuid, uuid);

alter table public.chat_rooms drop constraint if exists chat_rooms_slow_mode_seconds_check;
alter table public.chat_rooms drop column if exists slow_mode;
alter table public.chat_rooms drop column if exists slow_mode_seconds;

notify pgrst, 'reload schema';
