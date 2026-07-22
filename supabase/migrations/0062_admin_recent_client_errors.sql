-- supabase/migrations/0062_admin_recent_client_errors.sql
-- ════════════════════════════════════════════════════════════════════════
-- Migration 0062 — System Health detail: recent client error rows.
--
-- admin_system_health() (0056) only ever returned aggregates — counts and
-- a "top messages by occurrence" list with no stack trace, no path, no
-- reporting user, and no way to tell one occurrence of an error apart
-- from another. That's enough to see *that* something is wrong, but not
-- enough to actually debug it or copy a usable report out of the panel.
--
-- This adds a single admin-only RPC, admin_recent_client_errors, that
-- returns the most recent individual client_error_logs rows (not grouped)
-- with everything needed to inspect and copy a specific error: id,
-- message, stack, path, the reporting user's username (if any — errors
-- can be logged anonymously, see client_log_error in 0056), and
-- created_at. Capped at 200 rows regardless of what the caller asks for.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.admin_recent_client_errors(p_limit int default 40)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_limit int;
  v_rows jsonb;
begin
  if v_caller is null or not public.is_admin_role(v_caller) then
    raise exception 'CV_ADMIN_FORBIDDEN: admin only';
  end if;

  v_limit := least(greatest(coalesce(p_limit, 40), 1), 200);

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_rows
  from (
    select
      cel.id,
      cel.message,
      cel.stack,
      cel.path,
      p.username,
      cel.created_at
    from public.client_error_logs cel
    left join public.profiles p on p.id = cel.user_id
    order by cel.created_at desc
    limit v_limit
  ) t;

  return v_rows;
end;
$$;

revoke execute on function public.admin_recent_client_errors(int) from public;
grant execute on function public.admin_recent_client_errors(int) to authenticated;

notify pgrst, 'reload schema';
