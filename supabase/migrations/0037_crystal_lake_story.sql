-- supabase/migrations/0037_crystal_lake_story.sql
--
-- Adds Crystal Lake's two story-exclusive artifacts. No schema or
-- function changes — apply_story_checkpoint, exploration_chamber_runs
-- .story_state, and user_story_flags are all already map-agnostic (keyed
-- by map_id, not hardcoded to Greenfields), so map 2's story content
-- (src/features/exploration/story/content/map2.ts) works against
-- 0036_exploration_story.sql as-is. This migration only needs to seed
-- the two rows that content's `grant_artifact` effects target.
--
-- xp_bonus / artifact_odds_delta values used in map2.ts stay within the
-- same ceiling as map1.ts (30 XP / 0.20 odds), so the bounds documented
-- in 0036 remain accurate without changes there.
--
-- REMAINING TODO — same as 0036: the two rows below reuse the Crystal
-- Lake map splash image as a placeholder media_url; swap in real
-- ember/coal artifact artwork before this ships.

insert into public.artifacts (id, name, location, reward_xp, tier, media_url, media_type, story_exclusive)
values
  ('cl_sennas_ember', 'Senna''s Ember', 'Crystal Lake', 4000, 'mythic',
    'https://gnobzfxtxrtcxfhhfjni.supabase.co/storage/v1/object/public/Artefacts/Map/45a3c9b17775c774156c9c924ed4a89e.webp.jpg',
    'image', true),
  ('cl_sennas_last_coal', 'Senna''s Last Coal', 'Crystal Lake', 4000, 'mythic',
    'https://gnobzfxtxrtcxfhhfjni.supabase.co/storage/v1/object/public/Artefacts/Map/45a3c9b17775c774156c9c924ed4a89e.webp.jpg',
    'image', true)
on conflict (id) do nothing;
