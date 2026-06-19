-- supabase/migrations/0002_profile_trigger_and_avatar_default.sql
-- ════════════════════════════════════════════════════
-- Migration 0002 — Server-side profile creation + remove avatar choice
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- Safe to run on an already-deployed project — every statement is
-- idempotent (IF EXISTS / OR REPLACE / ON CONFLICT) and can be re-run.
-- ════════════════════════════════════════════════════

-- 1. Fixes: "new row violates row-level security policy for table 'profiles'"
--    Root cause: the client inserted into profiles right after signUp(),
--    but with email confirmation on, signUp() returns no session yet, so
--    the insert ran as the anon role and RLS correctly rejected it.
--    Fix: create the row server-side the instant auth.users gets a new
--    row, so the client never has to INSERT under a possibly-missing
--    session — it only ever needs to update its own row later.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, avatar)
  values (
    new.id,
    split_part(new.email, '@', 1) || '_' || substr(md5(random()::text), 1, 4),
    split_part(new.email, '@', 1),
    'rocket'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Avatar is no longer user-chosen — every account gets the same
--    default icon, looked up client-side via lib/icons.ts.
alter table public.profiles
  alter column avatar set default 'rocket';

update public.profiles set avatar = 'rocket' where avatar = '🧑‍🚀';
