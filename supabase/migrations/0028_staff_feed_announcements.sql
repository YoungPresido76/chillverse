-- supabase/migrations/0028_staff_feed_announcements.sql
-- ════════════════════════════════════════════════════════════════════════
-- Migration 0028 — Staff Feed / Announcements
--
-- Adds the columns and storage needed for staff (staff/moderator/admin —
-- see is_staff() from migration 0027) to post announcements, feature
-- updates, and general staff posts into a dedicated "Announcements" tab,
-- distinct from the regular player Feed.
--
-- Staff posts reuse the existing `posts` table (author_type already had
-- 'admin'/'system' in its check constraint from migration 0007, but no
-- RLS policy ever allowed inserting with those values — only 'user' was
-- permitted). This migration adds:
--   1. post_kind   — distinguishes announcement / feature_update / general
--   2. pinned      — staff can pin an announcement to the top of the tab
--   3. media_url / media_type — image attachments (new capability; posts
--      previously had no media support at all)
--   4. a public "feed-images" storage bucket + RLS scoped to staff writes
--   5. RLS: staff can insert/update/delete posts authored as admin/system
--
-- Safe to run on an already-deployed project — every statement is
-- idempotent (IF EXISTS / IF NOT EXISTS / OR REPLACE / ON CONFLICT).
-- ════════════════════════════════════════════════════════════════════════

-- 1. New columns on posts ────────────────────────────────────────────────
alter table public.posts add column if not exists post_kind text not null default 'general';
alter table public.posts drop constraint if exists posts_post_kind_check;
alter table public.posts add constraint posts_post_kind_check
  check (post_kind in ('general', 'announcement', 'feature_update'));

alter table public.posts add column if not exists pinned boolean not null default false;

alter table public.posts add column if not exists media_url text;

alter table public.posts add column if not exists media_type text;
alter table public.posts drop constraint if exists posts_media_type_check;
alter table public.posts add constraint posts_media_type_check
  check (media_type is null or media_type in ('image'));

create index if not exists posts_staff_pinned_idx
  on public.posts (pinned desc, created_at desc)
  where author_type in ('admin', 'system');

-- 2. RLS — staff can insert posts as admin/system ────────────────────────
drop policy if exists "staff can insert staff posts" on public.posts;
create policy "staff can insert staff posts" on public.posts
  for insert with check (
    auth.uid() = author_id
    and author_type in ('admin', 'system')
    and public.is_staff(auth.uid())
  );

-- 3. RLS — staff can update staff posts (pin/unpin, edit, re-tag) ────────
drop policy if exists "staff can update staff posts" on public.posts;
create policy "staff can update staff posts" on public.posts
  for update using (
    author_type in ('admin', 'system')
    and public.is_staff(auth.uid())
  )
  with check (
    author_type in ('admin', 'system')
    and public.is_staff(auth.uid())
  );

-- 4. RLS — staff can delete any staff post (not just their own) ─────────
drop policy if exists "staff can delete staff posts" on public.posts;
create policy "staff can delete staff posts" on public.posts
  for delete using (
    author_type in ('admin', 'system')
    and public.is_staff(auth.uid())
  );

-- 5. Storage: public "feed-images" bucket ────────────────────────────────
-- Public bucket (unlike voice-notes) because the Feed and Announcements
-- tab are both publicly readable — no signed URLs needed for playback.
insert into storage.buckets (id, name, public)
values ('feed-images', 'feed-images', true)
on conflict (id) do nothing;

-- Object path convention enforced by the client: `<author_id>/<uuid>.<ext>`.
drop policy if exists "feed images are publicly readable" on storage.objects;
create policy "feed images are publicly readable" on storage.objects
  for select using (bucket_id = 'feed-images');

drop policy if exists "staff can upload feed images" on storage.objects;
create policy "staff can upload feed images" on storage.objects
  for insert with check (
    bucket_id = 'feed-images'
    and public.is_staff(auth.uid())
  );

drop policy if exists "staff can delete feed images" on storage.objects;
create policy "staff can delete feed images" on storage.objects
  for delete using (
    bucket_id = 'feed-images'
    and public.is_staff(auth.uid())
  );

notify pgrst, 'reload schema';
