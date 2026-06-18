// supabase/migration_001.sql

-- ════════════════════════════════════════════════════
-- Migration 001: trigger-based profile creation
--               + avatar column default fix
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ════════════════════════════════════════════════════

-- 1. Fix avatar column default (icon name string, not raw emoji)
alter table public.profiles
  alter column avatar set default 'rocket';

update public.profiles
  set avatar = 'rocket'
  where avatar = '🧑‍🚀';

-- 2. Trigger function — runs as SECURITY DEFINER so it bypasses
--    RLS and always has permission to insert into public.profiles.
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

-- 3. Attach trigger to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
