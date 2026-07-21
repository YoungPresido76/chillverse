-- supabase/migrations/0056_fix_badge_availability_log.sql
-- ════════════════════════════════════════════════════════════════════════
-- Migration 0056 — Fix mod_set_badge_availability logging
--
-- 0053 introduced mod_set_badge_availability, but its moderation_log
-- insert was broken three ways:
--   1. It passed the badge's text id (e.g. 'top_ranked') into
--      moderation_log.target_id, which is a uuid column — every call
--      failed with "column target_id is of type uuid but expression is
--      of type text".
--   2. moderation_log_action_check never had 'set_badge_availability'
--      added to its allow-list.
--   3. moderation_log's target_type check never had 'badge' added to
--      its allow-list either.
-- Fix: widen both check constraints (following the pattern from 0041),
-- and rewrite the function to leave target_id null (badge ids aren't
-- uuids) and carry the badge id inside metadata instead.
-- ════════════════════════════════════════════════════════════════════════

-- 1. Widen the action check to allow logging this action.
alter table public.moderation_log drop constraint if exists moderation_log_action_check;
alter table public.moderation_log
  add constraint moderation_log_action_check check (action in (
    'ban', 'suspend', 'unban', 'set_role',
    'delete_message', 'delete_post', 'delete_comment', 'review_report',
    'auto_hide', 'unhide', 'auto_violation', 'resolve_alert',
    'set_verified', 'set_badge_availability'
  ));

-- 2. Widen the target_type check to allow 'badge'.
alter table public.moderation_log drop constraint if exists moderation_log_target_type_check;
alter table public.moderation_log
  add constraint moderation_log_target_type_check check (target_type in (
    'user', 'message', 'post', 'comment', 'report', 'badge'
  ));

-- 3. Fix the function: don't try to shove a text badge id into a uuid
--    column — leave target_id null and put the badge id in metadata.
create or replace function public.mod_set_badge_availability(p_badge_id text, p_is_available boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is null or not public.is_staff(v_caller) then
    raise exception 'CV_MOD_FORBIDDEN: staff role required';
  end if;

  if not exists (select 1 from public.badges where id = p_badge_id) then
    raise exception 'CV_MOD_NOT_FOUND: badge not found';
  end if;

  update public.badges set is_available = p_is_available where id = p_badge_id;

  insert into public.moderation_log (moderator_id, action, target_type, target_id, metadata)
    values (
      v_caller,
      'set_badge_availability',
      'badge',
      null,
      jsonb_build_object('badge_id', p_badge_id, 'is_available', p_is_available)
    );
end;
$$;

revoke execute on function public.mod_set_badge_availability(text, boolean) from public;
grant execute on function public.mod_set_badge_availability(text, boolean) to authenticated;

notify pgrst, 'reload schema';
