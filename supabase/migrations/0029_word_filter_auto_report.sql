-- supabase/migrations/0029_word_filter_auto_report.sql
-- ════════════════════════════════════════════════════════════════════════
-- Migration 0029 — Word filter → auto-report
--
-- A second, softer tier below the hard block from 0017
-- (contains_blocked_language / block_profane_*, which rejects the insert
-- outright). This tier does NOT block anything — the message/post/comment
-- goes through normally — it just automatically files a system report so
-- a moderator sees it in the Reports queue.
--
-- Deliberately narrow and pattern-based, not an exhaustive phrase list:
--   1. Self-harm language directed at another user.
--   2. Off-platform contact solicitation (phone numbers, "add me on
--      whatsapp/snap/telegram/etc") — a common vector for taking a
--      conversation somewhere unmoderated, worth a human look given this
--      app may have minors on it.
--   3. Basic scam/phishing phrasing.
-- ════════════════════════════════════════════════════════════════════════

-- 'auto_flagged' is a new system-only reason. reporter_id becomes nullable
-- since these reports aren't filed by any particular person.
alter table public.content_reports
  drop constraint if exists content_reports_reason_check;
alter table public.content_reports
  add constraint content_reports_reason_check check (reason in (
    'harassment', 'hate_speech', 'inappropriate_content', 'spam',
    'impersonation', 'cheating', 'other', 'auto_flagged'
  ));

alter table public.content_reports alter column reporter_id drop not null;

create or replace function public.flag_reason_for_content(input text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when input ~* '\m(kill\s*yourself|kys)\M'
      then 'Possible self-harm language directed at another user'
    when input ~ '\d{7,}'
      or input ~* '\m(add me on|dm me on|message me on)\s*(whatsapp|snap(chat)?|telegram|kik|instagram)\M'
      then 'Possible off-platform contact solicitation'
    when input ~* '\m(click here|free (robux|diamonds|gems|v-?bucks)|verify your account)\M'
      then 'Possible spam or scam content'
    else null
  end;
$$;

create or replace function public.auto_flag_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := public.flag_reason_for_content(new.content);
begin
  if v_reason is not null then
    insert into public.content_reports (reporter_id, target_type, target_id, reason, details, status)
      values (null, 'message', new.id, 'auto_flagged', v_reason, 'open');
  end if;
  return new;
end;
$$;

drop trigger if exists on_message_auto_flag on public.messages;
create trigger on_message_auto_flag
  after insert on public.messages
  for each row execute function public.auto_flag_message();

create or replace function public.auto_flag_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := public.flag_reason_for_content(new.body);
begin
  if v_reason is not null then
    insert into public.content_reports (reporter_id, target_type, target_id, reason, details, status)
      values (null, 'post', new.id, 'auto_flagged', v_reason, 'open');
  end if;
  return new;
end;
$$;

drop trigger if exists on_post_auto_flag on public.posts;
create trigger on_post_auto_flag
  after insert on public.posts
  for each row execute function public.auto_flag_post();

create or replace function public.auto_flag_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := public.flag_reason_for_content(new.body);
begin
  if v_reason is not null then
    insert into public.content_reports (reporter_id, target_type, target_id, reason, details, status)
      values (null, 'comment', new.id, 'auto_flagged', v_reason, 'open');
  end if;
  return new;
end;
$$;

drop trigger if exists on_comment_auto_flag on public.comments;
create trigger on_comment_auto_flag
  after insert on public.comments
  for each row execute function public.auto_flag_comment();

notify pgrst, 'reload schema';
