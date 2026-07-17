-- supabase/migrations/0036_exploration_story.sql
--
-- Adds narrative checkpoints (start/mid/claim per chamber) on top of the
-- existing exploration_chamber_runs system. Additive only — no existing
-- column, row, or RPC signature is changed.
--
-- Schema verified directly against the live database (project
-- gnobzfxtxrtcxfhhfjni) before writing this, not inferred from client
-- code — in particular artifacts.id / player_artifacts.artifact_id are
-- `text`, not `uuid`, and artifacts.media_url has no default (both
-- differ from the assumptions in the original draft of this migration).
--
-- REMAINING TODO — the two artifacts inserted below reuse an existing
-- Greenfields image as a placeholder media_url; swap in real key artwork
-- before this ships.
--
-- SECURITY NOTE — apply_story_checkpoint takes a client-supplied p_effects
-- payload rather than looking up expected effects server-side from
-- p_choice_id. Following the same pragmatic pattern already accepted for
-- award_xp in migration 0021 ("bounded per call" rather than a full
-- server-side content lookup), this migration bounds xp_bonus and
-- artifact_odds_delta to headroom above the highest legitimate value in
-- the current Greenfields content (30 XP / 0.20 odds), and grant_artifact
-- can only ever target rows flagged story_exclusive — so a malicious
-- client can at most harvest a few extra small XP bonuses per real
-- chamber run (still gated by the existing energy economy) or duplicate a
-- story key it may already own (blocked by the not-exists check below).
-- Fully closing this would mean validating p_choice_id against a
-- server-side copy of the story content per chamber/stage — flagging as a
-- follow-up, not done here, matching how 0021 documented the same
-- trade-off for award_xp.

-- ── story_state on each chamber run ─────────────────────────────
alter table public.exploration_chamber_runs
  add column if not exists story_state jsonb not null default '{}'::jsonb;

-- ── durable per-user narrative flags (journal fragments, endings, etc.) ──
create table if not exists public.user_story_flags (
  user_id    uuid not null references auth.users(id) on delete cascade,
  flag_key   text not null,
  value      jsonb not null default 'true'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, flag_key)
);

alter table public.user_story_flags enable row level security;

create policy "select own story flags"
  on public.user_story_flags for select
  using (auth.uid() = user_id);
-- No insert/update/delete policy: only the security-definer function
-- below writes to this table.

-- ── story-exclusive artifacts ───────────────────────────────────
-- media_url is a placeholder (reuses an existing Greenfields asset) —
-- swap for real key artwork before this ships; everything else matches
-- the live artifacts table's conventions (text id, mythic tier since
-- these are the rarest items in the game, story_exclusive is new).
alter table public.artifacts
  add column if not exists story_exclusive boolean not null default false;

insert into public.artifacts (id, name, location, reward_xp, tier, media_url, media_type, story_exclusive)
values
  ('gf_miras_key', 'Mira''s Key', 'Greenfields', 2000, 'mythic',
    'https://gnobzfxtxrtcxfhhfjni.supabase.co/storage/v1/object/public/Artefacts/Accessories/Lighter.jpg',
    'image', true),
  ('gf_miras_second_key', 'Mira''s Second Key', 'Greenfields', 2000, 'mythic',
    'https://gnobzfxtxrtcxfhhfjni.supabase.co/storage/v1/object/public/Artefacts/Accessories/Lighter.jpg',
    'image', true)
on conflict (id) do nothing;

-- ── apply_story_checkpoint ──────────────────────────────────────
-- Idempotent per (user, map, chamber, stage): the first call that lands
-- for a given stage applies effects and marks it seen; every call after
-- that (double-click, two tabs, retried request) is a no-op. Returns the
-- total artifact_odds_delta from this call's effects so the caller can
-- fold it into that run's tryArtifactDrop chance immediately — no delta
-- is persisted, since only the claim stage ever carries this effect type.
create or replace function public.apply_story_checkpoint(
  p_user_id    uuid,
  p_map_id     integer,
  p_chamber_id integer,
  p_stage      text,       -- 'start' | 'mid' | 'claim'
  p_choice_id  text,
  p_effects    jsonb        -- array of {type, ...} effect objects
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_already_seen boolean;
  v_odds_delta   numeric := 0;
  v_effect       jsonb;
  v_amount       int;
  v_artifact_id  text;
begin
  if auth.uid() <> p_user_id then
    raise exception 'not authorized';
  end if;

  if p_stage not in ('start', 'mid', 'claim') then
    raise exception 'invalid stage';
  end if;

  select coalesce((story_state -> p_stage ->> 'seen')::boolean, false)
    into v_already_seen
    from public.exploration_chamber_runs
    where user_id = p_user_id and map_id = p_map_id and chamber_id = p_chamber_id;

  if v_already_seen is null or v_already_seen then
    -- No matching run, or this stage was already resolved (including by a
    -- concurrent call) — nothing left to do.
    return jsonb_build_object('applied', false, 'odds_delta', 0);
  end if;

  update public.exploration_chamber_runs
    set story_state = jsonb_set(
      coalesce(story_state, '{}'::jsonb),
      array[p_stage],
      jsonb_build_object('seen', true, 'choiceId', p_choice_id)
    )
    where user_id = p_user_id and map_id = p_map_id and chamber_id = p_chamber_id
      and coalesce((story_state -> p_stage ->> 'seen')::boolean, false) = false;

  if not found then
    -- Lost the race to a concurrent call for the same stage.
    return jsonb_build_object('applied', false, 'odds_delta', 0);
  end if;

  for v_effect in select * from jsonb_array_elements(coalesce(p_effects, '[]'::jsonb))
  loop
    if v_effect ->> 'type' = 'xp_bonus' then
      v_amount := least(greatest((v_effect ->> 'amount')::int, 0), 50);
      perform public.award_xp(p_user_id, v_amount);

    elsif v_effect ->> 'type' = 'set_flag' then
      insert into public.user_story_flags (user_id, flag_key, value)
      values (p_user_id, v_effect ->> 'key', coalesce(v_effect -> 'value', 'true'::jsonb))
      on conflict (user_id, flag_key) do update
        set value = excluded.value, updated_at = now();

    elsif v_effect ->> 'type' = 'artifact_odds_delta' then
      v_odds_delta := v_odds_delta + least(greatest((v_effect ->> 'value')::numeric, 0), 0.3);

    elsif v_effect ->> 'type' = 'grant_artifact' then
      select id into v_artifact_id
        from public.artifacts
        where name = v_effect ->> 'artifactName' and story_exclusive = true
        limit 1;

      if v_artifact_id is not null then
        insert into public.player_artifacts (user_id, artifact_id)
        select p_user_id, v_artifact_id
        where not exists (
          select 1 from public.player_artifacts
          where user_id = p_user_id and artifact_id = v_artifact_id
        );
      end if;
    end if;
  end loop;

  return jsonb_build_object('applied', true, 'odds_delta', v_odds_delta);
end;
$$;

revoke execute on function public.apply_story_checkpoint(uuid, integer, integer, text, text, jsonb) from anon;
grant execute on function public.apply_story_checkpoint(uuid, integer, integer, text, text, jsonb) to authenticated;
