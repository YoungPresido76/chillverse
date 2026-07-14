-- supabase/migrations/0026_add_cv_social_badge.sql
-- ════════════════════════════════════════════════════════════════════════
-- Migration 0026 — New badge: CV (social share)
--
-- Awarded to players who post about Chillverse on TikTok, Instagram, or
-- X (Twitter) and rack up valid views/likes. There's no automated way to
-- verify off-platform engagement, and the account must be recognizably
-- the same player (their Chillverse username must match their handle on
-- the platform they posted on) — both of those need a human to check, so
-- like Tester this is grant_type = 'manual', assigned from the
-- Moderation Panel's Users tab after a player reaches out to Support
-- with a link to their post.
--
-- NOTE: this project's `badges` table itself isn't created by any
-- migration in this repo (it predates the migrations included here), so
-- this is a plain insert against the existing table/columns the client
-- already reads (see src/features/badges/badges.ts — BadgeDef). If your
-- `badges` table has additional NOT NULL columns beyond those, add them
-- to this insert before running.
-- ════════════════════════════════════════════════════════════════════════

insert into public.badges (id, title, description, icon, rarity, grant_type, is_dynamic_username)
values (
  'cv_social_share',
  'CV',
  'Posted Chillverse on TikTok, Instagram, or X (Twitter) and earned valid views and likes. Your username on that platform must match your Chillverse username.',
  'megaphone',
  'rare',
  'manual',
  false
)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
