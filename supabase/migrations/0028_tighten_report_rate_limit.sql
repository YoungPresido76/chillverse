-- supabase/migrations/0028_tighten_report_rate_limit.sql
-- ════════════════════════════════════════════════════════════════════════
-- Migration 0028 — Tighten the report rate limit
--
-- 0017 capped reporters at 20/day total. That stops runaway spam but does
-- nothing about one person filing several reports against the same single
-- target to force it into review — 20/day is plenty of room to do that.
--
-- New rule, same trigger (enforce_report_rate_limit), two checks:
--   1. Max 8 reports/day total (down from 20).
--   2. Max 3 reports/day against any one specific target.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.enforce_report_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count_today int;
  v_count_target_today int;
begin
  select count(*) into v_count_today
    from public.content_reports
    where reporter_id = new.reporter_id
      and created_at >= date_trunc('day', now());

  if v_count_today >= 8 then
    raise exception 'CV_REPORT_LIMIT: daily report limit reached, please try again tomorrow';
  end if;

  select count(*) into v_count_target_today
    from public.content_reports
    where reporter_id = new.reporter_id
      and target_type = new.target_type
      and target_id = new.target_id
      and created_at >= date_trunc('day', now());

  if v_count_target_today >= 3 then
    raise exception 'CV_REPORT_TARGET_LIMIT: you have already reported this today';
  end if;

  return new;
end;
$$;

notify pgrst, 'reload schema';
