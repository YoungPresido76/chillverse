-- supabase/migrations/0060_moderation_admin_tools.sql
-- ════════════════════════════════════════════════════════════════════════
-- Migration 0060 — Moderation Panel admin tools
--
-- Four independent pieces:
--
-- 1. WORD FILTER MANAGEMENT (no migration needed to add/edit banned terms)
--    New `banned_terms` table replaces the hardcoded regex alternations in
--    contains_blocked_language (0017) and contains_profanity (0035), plus
--    the phrase lists inside flag_hard_violation itself (0031/0035) for
--    threat_of_violence, self_harm_directed, doxxing, illegal_activity,
--    and phishing_scam. Each existing pattern is seeded as its own row so
--    behavior is unchanged after this migration — only the storage moves.
--    contains_blocked_language/contains_profanity go from `immutable` SQL
--    to `stable` SQL since they now read a table.
--
--    personal_info_exposure is deliberately NOT moved into banned_terms —
--    it's structural regex (email shape, digit-run, API-key/secret shapes,
--    PEM headers), not a list of words/phrases, so a "term" row doesn't
--    make sense for it. Same for the soft-tier off-platform-solicitation
--    check in flag_reason_for_content. Both stay as they are.
--
-- 2. STRIKE THRESHOLD CONFIG
--    New singleton `moderation_settings` table (same id=1 shape as 0057's
--    app_config) holds strike_alert_threshold, read by
--    handle_hard_violation instead of the old `constant int := 6`.
--
-- 3. USER HISTORY / NOTES
--    New `staff_user_notes` table for free-text staff notes on an
--    account, plus mod_get_user_history(user_id) which merges strikes +
--    moderation_log entries + notes for one user into one
--    chronologically-sorted feed.
--
-- 4. BULK REPORT ACTIONS
--    mod_bulk_dismiss_reports(report_ids[]) does the one genuinely bulk-
--    friendly, homogeneous operation (a plain status flip) in SQL with a
--    single log entry. Bulk delete-and-action and bulk ban stay as
--    client-side loops over the existing per-item mod_delete_*/mod_ban_user
--    RPCs (Promise.allSettled) — those RPCs already carry the right
--    permission checks and audit logging per item, and report targets are
--    heterogeneous (message/post/comment/user), so one atomic bulk RPC
--    would just be re-implementing that per-type branching in SQL for no
--    real benefit.
--
-- Depends on: 0017/0031/0035 (filter functions being replaced), 0024
-- (is_staff, moderation_log), 0041 (is_mod_or_admin), 0057 (is_admin_role
-- already existed by 0024; app_config singleton pattern mirrored here).
-- Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1a. banned_terms ──────────────────────────────────────────────────
create table if not exists public.banned_terms (
  id         uuid primary key default gen_random_uuid(),
  category   text not null check (category in (
               'hate_speech', 'profanity', 'threat_of_violence',
               'self_harm_directed', 'doxxing', 'illegal_activity', 'phishing_scam'
             )),
  -- A regex fragment, same style as the alternatives that used to live
  -- inside the \m(a|b|c)\M lists in 0017/0031/0035 — e.g. `kys` or
  -- `kill\s*yourself`. Combined at query time with word/phrase boundaries.
  pattern    text not null,
  active     boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists banned_terms_category_pattern_idx
  on public.banned_terms (category, pattern);
create index if not exists banned_terms_category_active_idx
  on public.banned_terms (category, active);

alter table public.banned_terms enable row level security;
drop policy if exists "staff can view banned terms" on public.banned_terms;
create policy "staff can view banned terms" on public.banned_terms
  for select using (public.is_staff(auth.uid()));
-- No insert/update/delete policy — only written by the mod_* RPCs below.

-- Seed with every existing hardcoded pattern, split into one row each, so
-- filter behavior is unchanged after this migration.
insert into public.banned_terms (category, pattern) values
  ('hate_speech', 'nigger'),
  ('hate_speech', 'nigga'),
  ('hate_speech', 'faggot'),
  ('hate_speech', 'fag'),
  ('hate_speech', 'retard(ed)?'),
  ('hate_speech', 'spastic'),
  ('hate_speech', 'chink'),
  ('hate_speech', 'spic'),
  ('hate_speech', 'kike'),
  ('hate_speech', 'tranny'),
  ('hate_speech', 'cunt'),
  ('hate_speech', 'rapist'),

  ('profanity', 'fuck(s|ing|ed|er|face|tard)?'),
  ('profanity', 'mother\s*fucker'),
  ('profanity', 'bitch(es|y)?'),
  ('profanity', 'shit(ty|head)?'),
  ('profanity', 'bullshit'),
  ('profanity', 'assh?ole'),
  ('profanity', 'dickhead'),
  ('profanity', 'bastard'),
  ('profanity', 'slut'),
  ('profanity', 'whore'),
  ('profanity', 'piss\s*off'),
  ('profanity', 'cunt'),

  ('threat_of_violence', 'i will kill you'),
  ('threat_of_violence', 'i''ll kill you'),
  ('threat_of_violence', 'i will hurt you'),
  ('threat_of_violence', 'i''ll hurt you'),
  ('threat_of_violence', 'i will beat you up'),
  ('threat_of_violence', 'gonna kill you'),
  ('threat_of_violence', 'i know where you live'),

  ('self_harm_directed', 'kill\s*yourself'),
  ('self_harm_directed', 'kys'),
  ('self_harm_directed', 'go die'),

  ('doxxing', '(his|her|their) (home )?address is'),
  ('doxxing', 'i (found|have) (your|his|her|their) (address|phone number|ssn|social security)'),

  ('illegal_activity', 'selling (weed|drugs|guns|firearms|cocaine|meth)'),
  ('illegal_activity', 'buy (weed|drugs|guns) (here|from me)'),
  ('illegal_activity', 'dm (me )?to buy (drugs|weed|guns)'),

  ('phishing_scam', 'click here'),
  ('phishing_scam', 'free (robux|diamonds|gems|v-?bucks)'),
  ('phishing_scam', 'verify your account'),
  ('phishing_scam', 'claim your prize')
on conflict (category, pattern) do nothing;

-- ── 1b. Build a \m(a|b|c)\M regex from the active rows in one category.
-- Returns null (not an empty alternation, which would match everything)
-- when a category has no active terms left. ─────────────────────────────
create or replace function public.banned_terms_regex(p_category text)
returns text
language sql
stable
set search_path = public
as $$
  select case when count(*) = 0 then null
    else '\m(' || string_agg(pattern, '|') || ')\M'
  end
  from public.banned_terms
  where category = p_category and active;
$$;

-- ── 1c. contains_blocked_language / contains_profanity now read the table
-- instead of a hardcoded alternation. Signatures unchanged. ─────────────
create or replace function public.contains_blocked_language(input text)
returns boolean
language sql
stable
set search_path = public
as $$
  select case
    when public.banned_terms_regex('hate_speech') is null then false
    else input ~* public.banned_terms_regex('hate_speech')
  end;
$$;

create or replace function public.contains_profanity(input text)
returns boolean
language sql
stable
set search_path = public
as $$
  select case
    when public.banned_terms_regex('profanity') is null then false
    else input ~* public.banned_terms_regex('profanity')
  end;
$$;

-- ── 1d. flag_hard_violation: the five phrase-list categories now check
-- against banned_terms_regex() instead of an inline alternation. Priority
-- order and the two structural categories (personal_info, profanity) are
-- unchanged from 0035. ────────────────────────────────────────────────
create or replace function public.flag_hard_violation(input text)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_regex text;
begin
  if public.contains_blocked_language(input) then
    return 'hate_speech';
  end if;

  v_regex := public.banned_terms_regex('threat_of_violence');
  if v_regex is not null and input ~* v_regex then return 'threat_of_violence'; end if;

  v_regex := public.banned_terms_regex('self_harm_directed');
  if v_regex is not null and input ~* v_regex then return 'self_harm_directed'; end if;

  v_regex := public.banned_terms_regex('doxxing');
  if v_regex is not null and input ~* v_regex then return 'doxxing'; end if;

  v_regex := public.banned_terms_regex('illegal_activity');
  if v_regex is not null and input ~* v_regex then return 'illegal_activity'; end if;

  v_regex := public.banned_terms_regex('phishing_scam');
  if v_regex is not null and input ~* v_regex then return 'phishing_scam'; end if;

  if public.contains_personal_info(input) then
    return 'personal_info_exposure';
  end if;

  if public.contains_profanity(input) then
    return 'profanity';
  end if;

  return null;
end;
$$;

-- ── 2. moderation_settings — singleton, same shape as 0057's app_config ─
create table if not exists public.moderation_settings (
  id                      int primary key default 1,
  strike_alert_threshold  int not null default 6,
  updated_at              timestamptz not null default now(),
  updated_by              uuid references public.profiles(id) on delete set null,
  constraint moderation_settings_singleton check (id = 1)
);

alter table public.moderation_settings enable row level security;
drop policy if exists "staff can view moderation settings" on public.moderation_settings;
create policy "staff can view moderation settings" on public.moderation_settings
  for select using (public.is_staff(auth.uid()));

insert into public.moderation_settings (id) values (1) on conflict (id) do nothing;

-- handle_hard_violation now reads the threshold instead of a constant.
create or replace function public.handle_hard_violation(
  p_user_id uuid, p_category text, p_target_type text, p_target_id uuid, p_original_content text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_strike_count int;
  v_alert_threshold int;
begin
  select strike_alert_threshold into v_alert_threshold
    from public.moderation_settings where id = 1;
  v_alert_threshold := coalesce(v_alert_threshold, 6);

  insert into public.content_reports (reporter_id, target_type, target_id, reason, details, status)
    values (null, p_target_type, p_target_id, 'auto_flagged',
            left('Automatically removed: ' || p_category || ' | original content: ' || p_original_content, 500),
            'actioned');

  insert into public.moderation_log (moderator_id, action, target_type, target_id, reason, metadata)
    values (null, 'auto_violation', p_target_type, p_target_id, p_category, jsonb_build_object('user_id', p_user_id));

  if p_user_id is null then
    return;
  end if;

  insert into public.strikes (user_id, category, target_type, target_id)
    values (p_user_id, p_category, p_target_type, p_target_id);

  select count(*) into v_strike_count from public.strikes where user_id = p_user_id;

  if v_strike_count = v_alert_threshold then
    insert into public.staff_alerts (user_id, strike_count)
      values (p_user_id, v_strike_count);
  end if;
end;
$$;

create or replace function public.mod_get_settings()
returns public.moderation_settings
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_row public.moderation_settings;
begin
  if v_caller is null or not public.is_staff(v_caller) then
    raise exception 'CV_MOD_FORBIDDEN: staff only';
  end if;

  select * into v_row from public.moderation_settings where id = 1;
  return v_row;
end;
$$;

create or replace function public.mod_update_strike_threshold(p_threshold int)
returns public.moderation_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_row public.moderation_settings;
begin
  if v_caller is null or not public.is_admin_role(v_caller) then
    raise exception 'CV_MOD_FORBIDDEN: admin only';
  end if;

  if p_threshold is null or p_threshold < 1 or p_threshold > 100 then
    raise exception 'CV_MOD_BAD_STATUS: threshold must be between 1 and 100';
  end if;

  update public.moderation_settings
    set strike_alert_threshold = p_threshold, updated_by = v_caller, updated_at = now()
    where id = 1
    returning * into v_row;

  insert into public.moderation_log (moderator_id, action, target_type, target_id, metadata)
    values (v_caller, 'update_settings', 'moderation_settings', null, jsonb_build_object('strike_alert_threshold', p_threshold));

  return v_row;
end;
$$;

-- ── 3. staff_user_notes + merged history ─────────────────────────────
create table if not exists public.staff_user_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete set null,
  note       text not null,
  created_at timestamptz not null default now()
);

create index if not exists staff_user_notes_user_idx on public.staff_user_notes (user_id, created_at desc);

alter table public.staff_user_notes enable row level security;
drop policy if exists "staff can view user notes" on public.staff_user_notes;
create policy "staff can view user notes" on public.staff_user_notes
  for select using (public.is_staff(auth.uid()));
-- No insert/update/delete policy — only written by mod_add_user_note.

create or replace function public.mod_add_user_note(p_user_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is null or not public.is_staff(v_caller) then
    raise exception 'CV_MOD_FORBIDDEN: staff only';
  end if;

  if p_note is null or char_length(trim(p_note)) = 0 then
    raise exception 'CV_MOD_REASON_REQUIRED: a note is required';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'CV_MOD_NOT_FOUND: user not found';
  end if;

  insert into public.staff_user_notes (user_id, author_id, note) values (p_user_id, v_caller, trim(p_note));

  insert into public.moderation_log (moderator_id, action, target_type, target_id, reason)
    values (v_caller, 'add_user_note', 'user', p_user_id, left(trim(p_note), 200));
end;
$$;

-- One merged, chronologically-sorted feed for a single account: strikes,
-- moderation_log entries about them (either as the direct target, e.g.
-- bans, or via metadata.user_id, e.g. auto_violation), and staff notes.
create or replace function public.mod_get_user_history(p_user_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_result jsonb;
begin
  if v_caller is null or not public.is_staff(v_caller) then
    raise exception 'CV_MOD_FORBIDDEN: staff only';
  end if;

  select coalesce(jsonb_agg(entry order by sort_at desc), '[]'::jsonb) into v_result
  from (
    select s.created_at as sort_at, jsonb_build_object(
      'type', 'strike', 'id', s.id, 'created_at', s.created_at,
      'category', s.category, 'target_type', s.target_type
    ) as entry
    from public.strikes s where s.user_id = p_user_id

    union all

    select l.created_at as sort_at, jsonb_build_object(
      'type', 'log', 'id', l.id, 'created_at', l.created_at,
      'action', l.action, 'reason', l.reason, 'metadata', l.metadata,
      'moderator', (select username from public.profiles where id = l.moderator_id)
    ) as entry
    from public.moderation_log l
    where (l.target_type = 'user' and l.target_id = p_user_id)
       or (l.metadata->>'user_id' is not null and (l.metadata->>'user_id')::uuid = p_user_id)

    union all

    select n.created_at as sort_at, jsonb_build_object(
      'type', 'note', 'id', n.id, 'created_at', n.created_at,
      'note', n.note, 'author', (select username from public.profiles where id = n.author_id)
    ) as entry
    from public.staff_user_notes n where n.user_id = p_user_id
  ) combined;

  return v_result;
end;
$$;

-- ── 4. Banned-terms CRUD (admin-only writes, staff-readable list) ──────
create or replace function public.mod_list_banned_terms()
returns setof public.banned_terms
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_staff(auth.uid()) then
    raise exception 'CV_MOD_FORBIDDEN: staff only';
  end if;
  return query select * from public.banned_terms order by category, pattern;
end;
$$;

create or replace function public.mod_add_banned_term(p_category text, p_pattern text)
returns public.banned_terms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_row public.banned_terms;
begin
  if v_caller is null or not public.is_admin_role(v_caller) then
    raise exception 'CV_MOD_FORBIDDEN: admin only';
  end if;

  if p_category not in ('hate_speech', 'profanity', 'threat_of_violence', 'self_harm_directed', 'doxxing', 'illegal_activity', 'phishing_scam') then
    raise exception 'CV_MOD_BAD_STATUS: invalid category';
  end if;

  if p_pattern is null or char_length(trim(p_pattern)) = 0 then
    raise exception 'CV_MOD_REASON_REQUIRED: a pattern is required';
  end if;

  insert into public.banned_terms (category, pattern, created_by)
    values (p_category, trim(p_pattern), v_caller)
    returning * into v_row;

  insert into public.moderation_log (moderator_id, action, target_type, target_id, reason, metadata)
    values (v_caller, 'add_banned_term', 'banned_term', v_row.id, p_category, jsonb_build_object('pattern', v_row.pattern));

  return v_row;
exception
  when unique_violation then
    raise exception 'CV_MOD_BAD_STATUS: that term already exists in this category';
end;
$$;

create or replace function public.mod_update_banned_term(p_id uuid, p_pattern text default null, p_active boolean default null)
returns public.banned_terms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_row public.banned_terms;
begin
  if v_caller is null or not public.is_admin_role(v_caller) then
    raise exception 'CV_MOD_FORBIDDEN: admin only';
  end if;

  update public.banned_terms
    set pattern = coalesce(nullif(trim(p_pattern), ''), pattern),
        active  = coalesce(p_active, active)
    where id = p_id
    returning * into v_row;

  if v_row.id is null then
    raise exception 'CV_MOD_NOT_FOUND: term not found';
  end if;

  insert into public.moderation_log (moderator_id, action, target_type, target_id, reason, metadata)
    values (v_caller, 'update_banned_term', 'banned_term', v_row.id, v_row.category, jsonb_build_object('pattern', v_row.pattern, 'active', v_row.active));

  return v_row;
end;
$$;

create or replace function public.mod_delete_banned_term(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_category text;
begin
  if v_caller is null or not public.is_admin_role(v_caller) then
    raise exception 'CV_MOD_FORBIDDEN: admin only';
  end if;

  delete from public.banned_terms where id = p_id returning category into v_category;
  if v_category is null then
    raise exception 'CV_MOD_NOT_FOUND: term not found';
  end if;

  insert into public.moderation_log (moderator_id, action, target_type, target_id, reason)
    values (v_caller, 'delete_banned_term', 'banned_term', p_id, v_category);
end;
$$;

-- ── 5. Bulk report dismissal ────────────────────────────────────────────
-- Only flips currently-open reports (mirrors mod_review_report's staff-
-- level gate for 'dismissed'); silently skips ids that are already past
-- 'open' rather than erroring the whole batch.
create or replace function public.mod_bulk_dismiss_reports(p_report_ids uuid[])
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_count int;
begin
  if v_caller is null or not public.is_staff(v_caller) then
    raise exception 'CV_MOD_FORBIDDEN: staff only';
  end if;

  if p_report_ids is null or array_length(p_report_ids, 1) is null then
    raise exception 'CV_MOD_NOT_FOUND: no reports selected';
  end if;

  update public.content_reports
    set status = 'dismissed'
    where id = any(p_report_ids) and status = 'open';

  get diagnostics v_count = row_count;

  insert into public.moderation_log (moderator_id, action, target_type, target_id, metadata)
    values (v_caller, 'review_report', 'report', null, jsonb_build_object('status', 'dismissed', 'bulk', true, 'report_ids', to_jsonb(p_report_ids), 'count', v_count));

  return v_count;
end;
$$;

-- ── 6. Widen moderation_log's action/target_type whitelists ────────────
alter table public.moderation_log drop constraint if exists moderation_log_action_check;
alter table public.moderation_log add constraint moderation_log_action_check
  check (action = ANY (ARRAY[
    'ban', 'suspend', 'unban', 'set_role', 'delete_message', 'delete_post', 'delete_comment',
    'review_report', 'auto_hide', 'unhide', 'auto_violation', 'resolve_alert', 'set_verified',
    'set_badge_availability',
    'set_feature_flag', 'set_maintenance_mode', 'broadcast_notification', 'export_users', 'export_transactions',
    'ticket_claim', 'ticket_unclaim', 'ticket_reply', 'ticket_note', 'ticket_set_status',
    'ticket_escalate', 'ticket_deescalate', 'escalate_alert', 'escalate_report',
    'add_user_note', 'add_banned_term', 'update_banned_term', 'delete_banned_term', 'update_settings'
  ]::text[]));

alter table public.moderation_log drop constraint if exists moderation_log_target_type_check;
alter table public.moderation_log add constraint moderation_log_target_type_check
  check (target_type = ANY (ARRAY[
    'user', 'message', 'post', 'comment', 'report', 'badge',
    'feature_flag', 'app_config', 'export', 'notification', 'support_ticket',
    'banned_term', 'moderation_settings'
  ]::text[]));

-- ── 7. Lock down EXECUTE the same way every RPC in this project is ──────
revoke execute on function public.mod_get_settings() from public;
revoke execute on function public.mod_update_strike_threshold(int) from public;
revoke execute on function public.mod_add_user_note(uuid, text) from public;
revoke execute on function public.mod_get_user_history(uuid) from public;
revoke execute on function public.mod_list_banned_terms() from public;
revoke execute on function public.mod_add_banned_term(text, text) from public;
revoke execute on function public.mod_update_banned_term(uuid, text, boolean) from public;
revoke execute on function public.mod_delete_banned_term(uuid) from public;
revoke execute on function public.mod_bulk_dismiss_reports(uuid[]) from public;

grant execute on function public.mod_get_settings() to authenticated;
grant execute on function public.mod_update_strike_threshold(int) to authenticated;
grant execute on function public.mod_add_user_note(uuid, text) to authenticated;
grant execute on function public.mod_get_user_history(uuid) to authenticated;
grant execute on function public.mod_list_banned_terms() to authenticated;
grant execute on function public.mod_add_banned_term(text, text) to authenticated;
grant execute on function public.mod_update_banned_term(uuid, text, boolean) to authenticated;
grant execute on function public.mod_delete_banned_term(uuid) to authenticated;
grant execute on function public.mod_bulk_dismiss_reports(uuid[]) to authenticated;

notify pgrst, 'reload schema';
