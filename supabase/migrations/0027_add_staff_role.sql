-- supabase/migrations/0027_add_staff_role.sql
-- ════════════════════════════════════════════════════════════════════════
-- Migration 0027 — Add 'staff' to the assignable role set
--
-- Roles were: user, moderator, admin. This adds 'staff' as an additional
-- role an admin can assign from the Moderation Panel's Users tab
-- (alongside user/moderator/admin). It's treated the same as moderator
-- for panel access + manual-badge grant/revoke (is_staff() below), so a
-- 'staff' account can do everything a 'moderator' account can here; the
-- two labels are kept separate only so admins can distinguish the two
-- titles in the UI. Adjust is_staff()/mod_set_role() below if 'staff'
-- is meant to be a lighter-weight tier instead.
-- ════════════════════════════════════════════════════════════════════════

-- 1. Widen the role check constraint.
alter table public.user_moderation drop constraint if exists user_moderation_role_check;
alter table public.user_moderation
  add constraint user_moderation_role_check check (role in ('user', 'staff', 'moderator', 'admin'));

-- 2. is_staff() now also recognizes 'staff'.
create or replace function public.is_staff(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('staff', 'moderator', 'admin') from public.user_moderation where user_id = p_user_id),
    false
  );
$$;

-- 3. mod_set_role() accepts 'staff' as a valid target role.
create or replace function public.mod_set_role(p_target_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is null or not public.is_admin_role(v_caller) then
    raise exception 'CV_MOD_FORBIDDEN: admin role required';
  end if;

  if p_role not in ('user', 'staff', 'moderator', 'admin') then
    raise exception 'CV_MOD_BAD_ROLE: invalid role';
  end if;

  if p_target_id = v_caller and p_role <> 'admin' then
    raise exception 'CV_MOD_SELF_DEMOTE: cannot remove your own admin role here — have another admin do it';
  end if;

  insert into public.user_moderation (user_id, role)
    values (p_target_id, p_role)
    on conflict (user_id) do update set role = excluded.role, updated_at = now();

  insert into public.moderation_log (moderator_id, action, target_type, target_id, metadata)
    values (v_caller, 'set_role', 'user', p_target_id, jsonb_build_object('new_role', p_role));
end;
$$;

-- 4. mod_ban_user() must also require admin-level to action a 'staff'
--    target, same protection moderator/admin already had.
create or replace function public.mod_ban_user(p_target_id uuid, p_reason text, p_duration_hours integer default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_target_role text;
begin
  if v_caller is null or not public.is_staff(v_caller) then
    raise exception 'CV_MOD_FORBIDDEN: staff only';
  end if;

  if p_target_id = v_caller then
    raise exception 'CV_MOD_SELF: cannot ban yourself';
  end if;

  if not exists (select 1 from public.profiles where id = p_target_id) then
    raise exception 'CV_MOD_NOT_FOUND: user not found';
  end if;

  if p_reason is null or char_length(trim(p_reason)) = 0 then
    raise exception 'CV_MOD_REASON_REQUIRED: a reason is required';
  end if;

  select role into v_target_role from public.user_moderation where user_id = p_target_id;
  if coalesce(v_target_role, 'user') in ('staff', 'moderator', 'admin') and not public.is_admin_role(v_caller) then
    raise exception 'CV_MOD_INSUFFICIENT: only admins can action staff members';
  end if;

  insert into public.user_moderation (user_id, is_banned, banned_until, ban_reason, banned_by, banned_at)
    values (
      p_target_id, true,
      case when p_duration_hours is null then null else now() + (p_duration_hours || ' hours')::interval end,
      trim(p_reason), v_caller, now()
    )
    on conflict (user_id) do update
      set is_banned    = true,
          banned_until = excluded.banned_until,
          ban_reason   = excluded.ban_reason,
          banned_by    = excluded.banned_by,
          banned_at    = excluded.banned_at,
          updated_at   = now();

  insert into public.moderation_log (moderator_id, action, target_type, target_id, reason, metadata)
    values (
      v_caller, case when p_duration_hours is null then 'ban' else 'suspend' end, 'user', p_target_id, trim(p_reason),
      jsonb_build_object('duration_hours', p_duration_hours)
    );
end;
$$;

notify pgrst, 'reload schema';
