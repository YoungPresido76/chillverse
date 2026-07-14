-- supabase/migrations/0025_freeze_original_username.sql
-- ════════════════════════════════════════════════════════════════════════
-- Migration 0025 — Freeze the "Legacy Username" badge's username
--
-- BUG: badgeDisplayTitle() (src/features/badges/badges.ts) rendered
-- "Originally known as {username}" using the player's CURRENT username,
-- passed in live from `profiles.username` at every call site. Since that
-- column changes whenever the player renames themselves, the badge text
-- was silently drifting with every rename — the opposite of what a
-- "legacy"/"originally known as" badge should do.
--
-- FIX: capture the player's first-ever username exactly once, at account
-- creation, into a new column that is never touched again by the
-- username-change flow (Settings.tsx only ever updates `username` +
-- `username_changed_at`, never this column). The client now reads
-- `original_username` for the dynamic badge title instead of `username`.
-- ════════════════════════════════════════════════════════════════════════

-- 1. New column. Backfill existing players with their current username —
--    it's the earliest value we have on record for them.
alter table public.profiles
  add column if not exists original_username text;

update public.profiles
  set original_username = username
  where original_username is null;

-- 2. From here on, capture it once at signup and never again.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  v_username := split_part(new.email, '@', 1) || '_' || substr(md5(random()::text), 1, 4);

  insert into public.profiles (id, username, original_username, display_name, avatar)
  values (
    new.id,
    v_username,
    v_username,
    split_part(new.email, '@', 1),
    'rocket'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Belt-and-suspenders: even if something someday updates `username`
-- directly and also tries to touch `original_username` in the same
-- statement, this trigger snaps it back to whatever was already on
-- record — original_username is write-once from the app's perspective.
create or replace function public.protect_original_username()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'UPDATE' then
    new.original_username := old.original_username;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_original_username_trg on public.profiles;
create trigger protect_original_username_trg
  before update on public.profiles
  for each row execute procedure public.protect_original_username();

notify pgrst, 'reload schema';
