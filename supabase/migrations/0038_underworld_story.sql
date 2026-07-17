-- supabase/migrations/0038_underworld_story.sql
--
-- Adds Under World's two story-exclusive artifacts. No schema or function
-- changes — apply_story_checkpoint, exploration_chamber_runs.story_state,
-- and user_story_flags are already map-agnostic (keyed by map_id, not
-- hardcoded to Greenfields/Crystal Lake), so map 3's story content
-- (src/features/exploration/story/content/map3.ts) works against
-- 0036_exploration_story.sql as-is. This migration only needs to seed
-- the two rows that content's `grant_artifact` effects target — both on
-- chamber 4's (Abyss Gate) claim stage, since chamber 5 (The Sunken
-- Throne) is the narrative climax but not an artifact chamber this time.
--
-- xp_bonus / artifact_odds_delta values used in map3.ts stay within the
-- same ceiling as map1.ts/map2.ts (30 XP / 0.20 odds), so the bounds
-- documented in 0036 remain accurate without changes there.
--
-- REMAINING TODO — same as 0036/0037: the two rows below reuse the
-- Under World map splash image as a placeholder media_url, per the
-- established fallback for this project; swap in real vent-glass/pearl
-- artifact artwork before this ships.

insert into public.artifacts (id, name, location, reward_xp, tier, media_url, media_type, story_exclusive)
values
  ('uw_marens_vent_glass', 'Maren''s Vent-Glass', 'Under World', 6000, 'mythic',
    'https://gnobzfxtxrtcxfhhfjni.supabase.co/storage/v1/object/public/Artefacts/Map/7c15d735d2aeb8fff833fdd949d5c4a3.jpg',
    'image', true),
  ('uw_marens_keeper_pearl', 'Maren''s Keeper Pearl', 'Under World', 6000, 'mythic',
    'https://gnobzfxtxrtcxfhhfjni.supabase.co/storage/v1/object/public/Artefacts/Map/7c15d735d2aeb8fff833fdd949d5c4a3.jpg',
    'image', true)
on conflict (id) do nothing;
