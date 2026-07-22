-- supabase/migrations/0061_staff_post_comment_scope.sql
-- ════════════════════════════════════════════════════════════════════════
-- Migration 0061 — Staff: posts/comments only, plus ticket user lookup
--
-- Product decision following the 0059 tightening: 'staff' gets direct
-- delete-and-action rights back, but scoped to posts and comments only.
-- Messages stay moderator/admin-only (higher-signal, DM-adjacent content).
-- Bans/suspends remain moderator/admin-only — unchanged from 0059.
--
--   • mod_delete_post, mod_delete_comment now gate on is_staff() instead
--     of is_mod_or_admin(). mod_delete_message is untouched (still
--     is_mod_or_admin()).
--   • mod_review_report: setting a report to 'actioned' now allows staff
--     when the report's target_type is 'post' or 'comment' (matching the
--     delete permission above). 'message' and 'user' reports still
--     require is_mod_or_admin() to action — staff escalates those.
--   • New staff_get_ticket_user_card(uuid): read-only lookup used by the
--     support ticket queue so staff can see join date / verified status /
--     strike count next to a ticket without leaving the panel. Staff-gated,
--     SELECT-only, not written to moderation_log (pure read).
--
-- Depends on 0024 (is_staff, mod_delete_*, mod_review_report), 0031
-- (strikes table), 0041 (is_mod_or_admin, is_verified column), 0059
-- (current mod_delete_*/mod_review_report bodies being replaced here).
-- Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. Post/comment deletion moves back to staff-level ──────────────────
create or replace function public.mod_delete_post(p_post_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_snapshot jsonb;
begin
  if v_caller is null or not public.is_staff(v_caller) then
    raise exception 'CV_MOD_FORBIDDEN: staff role required';
  end if;

  select jsonb_build_object('author_id', author_id, 'body', body) into v_snapshot
    from public.posts where id = p_post_id;

  if v_snapshot is null then
    raise exception 'CV_MOD_NOT_FOUND: post not found';
  end if;

  delete from public.posts where id = p_post_id;

  insert into public.moderation_log (moderator_id, action, target_type, target_id, reason, metadata)
    values (v_caller, 'delete_post', 'post', p_post_id, p_reason, v_snapshot);
end;
$$;

create or replace function public.mod_delete_comment(p_comment_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_snapshot jsonb;
begin
  if v_caller is null or not public.is_staff(v_caller) then
    raise exception 'CV_MOD_FORBIDDEN: staff role required';
  end if;

  select jsonb_build_object('post_id', post_id, 'author_id', author_id, 'body', body) into v_snapshot
    from public.comments where id = p_comment_id;

  if v_snapshot is null then
    raise exception 'CV_MOD_NOT_FOUND: comment not found';
  end if;

  delete from public.comments where id = p_comment_id;

  insert into public.moderation_log (moderator_id, action, target_type, target_id, reason, metadata)
    values (v_caller, 'delete_comment', 'comment', p_comment_id, p_reason, v_snapshot);
end;
$$;

-- mod_delete_message is intentionally left as-is from 0059
-- (is_mod_or_admin() gate) — messages stay out of staff's reach.

-- ── 2. Reviewing a report to 'actioned' — staff may do this for ─────────
--      post/comment targets only, matching the delete scope above.
create or replace function public.mod_review_report(p_report_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_target_type text;
begin
  if v_caller is null or not public.is_staff(v_caller) then
    raise exception 'CV_MOD_FORBIDDEN: staff only';
  end if;

  if p_status not in ('reviewed', 'actioned', 'dismissed') then
    raise exception 'CV_MOD_BAD_STATUS: invalid status';
  end if;

  select target_type into v_target_type from public.content_reports where id = p_report_id;
  if v_target_type is null then
    raise exception 'CV_MOD_NOT_FOUND: report not found';
  end if;

  if p_status = 'actioned'
     and not public.is_mod_or_admin(v_caller)
     and v_target_type not in ('post', 'comment') then
    raise exception 'CV_MOD_INSUFFICIENT: staff can only action post/comment reports directly — escalate this one to a moderator';
  end if;

  update public.content_reports set status = p_status where id = p_report_id;
  if not found then
    raise exception 'CV_MOD_NOT_FOUND: report not found';
  end if;

  insert into public.moderation_log (moderator_id, action, target_type, target_id, metadata)
    values (v_caller, 'review_report', 'report', p_report_id, jsonb_build_object('status', p_status));
end;
$$;

-- ── 3. Read-only user lookup card for the staff ticket queue ────────────
-- Join date, verified status, ban status, and strike count for the user
-- behind a ticket — enough context for a reply, nothing actionable.
-- Strikes have no "resolved" concept in this schema (0031), so the count
-- returned is the user's total strike count to date.
create or replace function public.staff_get_ticket_user_card(p_target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_result jsonb;
begin
  if v_caller is null or not public.is_staff(v_caller) then
    raise exception 'CV_MOD_FORBIDDEN: staff only';
  end if;

  select jsonb_build_object(
    'join_date', p.created_at,
    'is_verified', coalesce(um.is_verified, false),
    'is_banned', coalesce(um.is_banned, false),
    'strike_count', (select count(*) from public.strikes s where s.user_id = p_target_id)
  )
  into v_result
  from public.profiles p
  left join public.user_moderation um on um.user_id = p.id
  where p.id = p_target_id;

  if v_result is null then
    raise exception 'CV_MOD_NOT_FOUND: user not found';
  end if;

  return v_result;
end;
$$;

revoke execute on function public.staff_get_ticket_user_card(uuid) from public;
grant execute on function public.staff_get_ticket_user_card(uuid) to authenticated;

notify pgrst, 'reload schema';
