-- supabase/migrations/0077_tighten_blog_images_bucket_policies.sql
--
-- The `blog-images` bucket (migration 0067) picked up extra generic
-- Dashboard-default policies alongside our staff-scoped ones, which
-- undermined the intended "staff only" design:
--   - "Authenticated upload for blog-images"  → any authenticated user could upload
--   - "Authenticated update for blog-images"  → any authenticated user could overwrite
--   - "Authenticated delete for blog-images"  → any authenticated user could delete
--   - "Public read access for blog-images"    → duplicate of our own SELECT policy
--
-- This also caused the "public_bucket_allows_listing" advisor warning, since
-- ANY select policy on storage.objects (even a "public read" one) enables the
-- .list() API to enumerate every file in the bucket, not just direct-URL reads.
-- Public buckets don't need a SELECT policy at all — Storage serves objects by
-- URL without checking RLS for public buckets. `feed-images` (migration 0028,
-- tightened later) already follows this pattern with zero SELECT policy.
--
-- Net effect after this migration: blog-images has staff-only insert/update/
-- delete, no SELECT policy, no listing exposure — matching feed-images exactly.

drop policy if exists "Authenticated upload for blog-images" on storage.objects;
drop policy if exists "Authenticated update for blog-images" on storage.objects;
drop policy if exists "Authenticated delete for blog-images" on storage.objects;
drop policy if exists "Public read access for blog-images" on storage.objects;
drop policy if exists "blog images are publicly readable" on storage.objects;

-- Staff-only insert/update/delete already exist from 0067
-- ("staff can upload/delete blog images"), but there's no staff UPDATE
-- policy yet (0067 only added insert/delete) — add it so staff can
-- overwrite/replace a hero image without deleting first.
drop policy if exists "staff can update blog images" on storage.objects;
create policy "staff can update blog images" on storage.objects
  for update using (
    bucket_id = 'blog-images'
    and public.is_staff(auth.uid())
  ) with check (
    bucket_id = 'blog-images'
    and public.is_staff(auth.uid())
  );

notify pgrst, 'reload schema';
