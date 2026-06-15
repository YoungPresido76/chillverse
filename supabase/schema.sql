-- ════════════════════════════════════════════════════
-- Chillverse — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ════════════════════════════════════════════════════

-- Profiles table — one row per user, linked to auth.users
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar text default '🧑‍🚀',
  country text,
  interests text[] default '{}',
  dob date,
  xp integer default 0,
  level integer default 1,
  streak integer default 0,
  connected_platform text,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Anyone can view profiles (needed for leaderboards / public profile pages)
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- Users can only insert their own profile (id must match their auth uid)
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Users can only update their own profile
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Username uniqueness is enforced by the UNIQUE constraint above.
-- If a signup fails with "duplicate key value violates unique constraint",
-- it means that username is already taken — show the user a friendly error.

-- ════════════════════════════════════════════════════
-- Optional: index for faster leaderboard queries
-- ════════════════════════════════════════════════════
create index if not exists profiles_xp_idx on public.profiles (xp desc);
create index if not exists profiles_streak_idx on public.profiles (streak desc);
