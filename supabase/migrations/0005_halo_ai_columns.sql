-- supabase/migrations/0005_halo_ai_columns.sql
-- Adds Halo AI daily-message-counter columns to the existing profiles table.
-- No new tables. Existing profile RLS policies already cover these fields.

alter table public.profiles
  add column if not exists halo_messages_today integer default 0,
  add column if not exists halo_last_message_date date default null;
