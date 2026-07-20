-- supabase/migrations/0051_blog.sql
-- ════════════════════════════════════════════════════════════════════════
-- Migration 0051 — Blog (base structure)
--
-- Adds:
--   • public.blog_posts                 — blog articles. Publicly readable
--                                          when published; admin-only write.
--                                          Named blog_posts (not "posts") to
--                                          avoid colliding with the existing
--                                          public.posts table used by the
--                                          social feed feature.
--   • public.search_blog_posts(text)    — security-definer RPC for ranked
--       full-text search over published posts (title/excerpt/content).
--   • public.increment_blog_post_view(uuid) — reserved for the future
--       "read time + view count" feature; added now so that feature is a
--       pure additive column/RPC change later, not a table redesign.
--
-- Depends on migration 0001 (public.profiles) and 0024 (is_admin_role).
-- Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. blog_posts ───────────────────────────────────────────────────────
create table if not exists public.blog_posts (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,
  title                text not null,
  excerpt              text,
  content              text not null, -- plain text; paragraphs separated by blank lines (matches support_articles convention)
  hero_image_url       text,
  category             text not null check (category in (
                          'game-updates', 'community-spotlight', 'chillverse-hq', 'how-to', 'safety'
                        )),
  -- Recurring franchise tag (e.g. 'update-log', 'top-of-the-ladder'). Null = standalone post.
  series               text,
  tags                 text[] not null default '{}',
  locale               text not null default 'en' check (locale in ('en', 'pcm')),
  -- Rows that are the same logical post translated into another locale share
  -- one translation_group_id. Null = no translation exists for this post.
  translation_group_id uuid,
  author_id            uuid references public.profiles(id) on delete set null,
  is_published         boolean not null default false,
  published_at         timestamptz,
  search_vector        tsvector generated always as (
                          setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                          setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
                          setweight(to_tsvector('english', coalesce(content, '')), 'C')
                        ) stored,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists blog_posts_published_idx  on public.blog_posts (published_at desc) where is_published = true;
create index if not exists blog_posts_category_idx    on public.blog_posts (category, published_at desc) where is_published = true;
create index if not exists blog_posts_series_idx       on public.blog_posts (series, published_at desc) where is_published = true;
create index if not exists blog_posts_locale_idx       on public.blog_posts (locale);
create index if not exists blog_posts_translation_idx  on public.blog_posts (translation_group_id) where translation_group_id is not null;
create index if not exists blog_posts_tags_idx         on public.blog_posts using gin (tags);
create index if not exists blog_posts_search_idx       on public.blog_posts using gin (search_vector);

alter table public.blog_posts enable row level security;

drop policy if exists "published blog posts are publicly readable" on public.blog_posts;
create policy "published blog posts are publicly readable" on public.blog_posts
  for select using (is_published = true);

drop policy if exists "admins can read all blog posts" on public.blog_posts;
create policy "admins can read all blog posts" on public.blog_posts
  for select using (public.is_admin_role(auth.uid()));

drop policy if exists "admins can create blog posts" on public.blog_posts;
create policy "admins can create blog posts" on public.blog_posts
  for insert with check (public.is_admin_role(auth.uid()));

drop policy if exists "admins can update blog posts" on public.blog_posts;
create policy "admins can update blog posts" on public.blog_posts
  for update using (public.is_admin_role(auth.uid())) with check (public.is_admin_role(auth.uid()));

drop policy if exists "admins can delete blog posts" on public.blog_posts;
create policy "admins can delete blog posts" on public.blog_posts
  for delete using (public.is_admin_role(auth.uid()));

-- ── 2. updated_at trigger ───────────────────────────────────────────────
create or replace function public.set_blog_post_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists blog_posts_set_updated_at on public.blog_posts;
create trigger blog_posts_set_updated_at
  before update on public.blog_posts
  for each row execute function public.set_blog_post_updated_at();

-- ── 3. search_blog_posts RPC ────────────────────────────────────────────
-- Ranked full-text search over published posts using websearch syntax.
create or replace function public.search_blog_posts(p_query text, p_locale text default null)
returns table (
  id uuid, slug text, title text, excerpt text, hero_image_url text,
  category text, series text, tags text[], locale text,
  published_at timestamptz, rank real
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id, p.slug, p.title, p.excerpt, p.hero_image_url,
    p.category, p.series, p.tags, p.locale,
    p.published_at, ts_rank(p.search_vector, websearch_to_tsquery('english', p_query)) as rank
  from public.blog_posts p
  where p.is_published = true
    and p.search_vector @@ websearch_to_tsquery('english', p_query)
    and (p_locale is null or p.locale = p_locale)
  order by rank desc
  limit 30;
$$;

grant execute on function public.search_blog_posts(text, text) to anon, authenticated;

-- ── 4. increment_blog_post_view RPC (reserved for the view-count feature) ──
create or replace function public.increment_blog_post_view(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.blog_posts
    set updated_at = updated_at -- no-op placeholder until a views column lands
    where id = p_post_id and is_published = true;
end;
$$;

revoke execute on function public.increment_blog_post_view(uuid) from public;
grant execute on function public.increment_blog_post_view(uuid) to anon, authenticated;

-- ── 5. Seed starter posts ───────────────────────────────────────────────
insert into public.blog_posts (slug, title, excerpt, content, category, series, tags, is_published, published_at)
values
  ('welcome-to-the-chillverse-blog',
   'Welcome to the Chillverse Blog',
   'Where we''ll be sharing updates, spotlights, and everything happening across Chillverse.',
   E'We built this blog to have one place for everything happening on Chillverse — patch notes, community spotlights, and the occasional dev diary straight from the team building it.\n\nExpect a mix of tones here: technical deep-dives sitting right next to casual community stories, same as you''d find on any good gaming blog. The category tag on each post tells you what you''re getting into.\n\nThanks for being here early. More soon.',
   'chillverse-hq', null, array['announcement'], true, now() - interval '14 days'),

  ('update-log-v1-2',
   'Update Log — v1.2',
   'Streak recap redesign, faster matchmaking in Whot, and a handful of bug fixes.',
   E'This release focuses on polish across the board.\n\nThe Streak page got a visual refresh with clearer milestone progress. Whot matchmaking is noticeably faster thanks to a queue rework. We also fixed a bug where profile banners occasionally failed to display after equipping them from the Mall.\n\nAs always, thanks for the bug reports — keep them coming.',
   'game-updates', 'update-log', array['patch-notes','whot'], true, now() - interval '10 days'),

  ('update-log-v1-1',
   'Update Log — v1.1',
   'Colour Block launches, plus daily streak milestone rewards.',
   E'Colour Block is live! Our second mini-game brings fast-paced puzzle matching to Chillverse, playable solo or in multiplayer rooms.\n\nWe also shipped daily streak milestones — log in and play to build a streak, with bonus XP at 1, 3, 7, 14, 30, and more days.\n\nFull patch details are in the Version page under Settings.',
   'game-updates', 'update-log', array['patch-notes','colour-block'], true, now() - interval '38 days'),

  ('how-to-play-whot',
   'How to play Whot on Chillverse',
   'A quick primer on rules, special cards, and how XP is calculated.',
   E'Whot is played with a deck of numbered and shape cards. Match the number or shape of the top card to play, or draw from the pile if you can''t.\n\nSpecial cards change the flow of the game — some skip the next player, others force them to pick up extra cards. The first player to clear their hand wins the round.\n\nXP earned scales with how quickly you win and how many opponents you beat, so faster wins against more players pay off more.',
   'how-to', null, array['whot','guide'], true, now() - interval '20 days'),

  ('staying-safe-on-chillverse',
   'Staying safe on Chillverse',
   'How reporting, blocking, and moderation work.',
   E'Chillverse is built to be a fun, respectful place to play. If another player breaks the rules — harassment, cheating, inappropriate content — you can report them from their profile or directly from a chat conversation.\n\nReports go to our moderation team for review. Repeat or severe violations can lead to warnings, temporary suspensions, or a permanent ban.\n\nIf you feel unsafe, you can also block a player from Settings, which stops them from messaging you or inviting you to games.',
   'safety', null, array['safety','moderation'], true, now() - interval '25 days'),

  ('community-spotlight-first-crew-tournament',
   'Community Spotlight: our first crew tournament',
   'A look back at the community-run bracket that packed the Rooms tab all weekend.',
   E'Last weekend a group of players self-organized an eight-crew Whot bracket entirely in the Rooms tab — no official support from us, just a shared spreadsheet and a lot of trash talk in global chat.\n\nWe loved watching it unfold, and it''s exactly the kind of energy that makes Chillverse fun. Congrats to the winning crew, and thank you to everyone who showed up to spectate.\n\nIf your crew is planning something similar, let us know — we''d love to help spread the word.',
   'community-spotlight', null, array['community','tournament'], true, now() - interval '5 days'),

  ('a-founders-note-on-whats-next',
   'A founder''s note on what''s next',
   'Some honest thoughts from Victor on where Chillverse is headed.',
   E'I started Chillverse because I wanted a place where Nigerian gamers could hang out, play quick rounds of the games we grew up with, and actually feel like the platform was built for us — not adapted from somewhere else.\n\nWe''re still small, and that means every bug report and piece of feedback genuinely shapes what we build next. The next few months are focused on more multiplayer rooms, deeper leaderboards, and (per popular request) more ways to customize your profile.\n\nThanks for playing, and for being early.',
   'chillverse-hq', null, array['founder'], true, now() - interval '2 days')
on conflict (slug) do nothing;

notify pgrst, 'reload schema';
