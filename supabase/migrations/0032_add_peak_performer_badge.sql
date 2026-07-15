-- supabase/migrations/0032_add_peak_performer_badge.sql
-- ════════════════════════════════════════════════════════════════════════
-- Migration 0032 — New badge: Peak Performer
--
-- A manual, staff-awarded badge for standout players — recognizing
-- exceptional performance rather than any single automatic trigger, so
-- like Tester and CV (see 0026) this is grant_type = 'manual', assigned
-- from the Moderation Panel's Users tab (grantManualBadge in badges.ts).
--
-- NOTE: same caveat as 0026 — this is a plain insert against the existing
-- `badges` table/columns the client already reads (BadgeDef in
-- src/features/badges/badges.ts). Icon key 'crown' is already mapped in
-- src/features/badges/badgeIcons.tsx, so no client changes are needed.
-- ════════════════════════════════════════════════════════════════════════

insert into public.badges (id, title, description, icon, rarity, grant_type, is_dynamic_username)
values (
  'peak_performer',
  'Peak Performer',
  'Recognized by the Chillverse team for standout, exceptional performance.',
  'crown',
  'epic',
  'manual',
  false
)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
