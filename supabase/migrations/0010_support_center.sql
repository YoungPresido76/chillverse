-- supabase/migrations/0010_support_center.sql
-- ════════════════════════════════════════════════════════════════════════
-- Migration 0010 — Support center
--
-- Adds:
--   • public.support_categories        — top-level help topics (e.g. "Account",
--                                          "Games", "Billing"), publicly readable.
--   • public.support_articles           — help articles under a category, with a
--                                          generated tsvector column for full-text
--                                          search. Publicly readable when published.
--   • public.support_article_feedback   — one row per (article, user) marking the
--                                          article as helpful / not helpful.
--   • public.support_tickets            — user-submitted support requests ("Contact
--                                          us"), visible only to their author.
--   • public.increment_support_article_view(uuid) — security-definer RPC used to
--       bump an article's view_count without granting clients direct UPDATE access.
--   • public.search_support_articles(text) — security-definer RPC used to run
--       ranked full-text search over published articles.
--
-- Depends on migration 0001 (public.profiles). Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. support_categories ──────────────────────────────────────────────
create table if not exists public.support_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  icon        text not null default 'HelpCircle', -- lucide-react icon name, mapped client-side
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.support_categories enable row level security;

drop policy if exists "categories are publicly readable" on public.support_categories;
create policy "categories are publicly readable" on public.support_categories
  for select using (true);

-- ── 2. support_articles ────────────────────────────────────────────────
create table if not exists public.support_articles (
  id                uuid primary key default gen_random_uuid(),
  category_id       uuid not null references public.support_categories(id) on delete cascade,
  slug              text not null,
  title             text not null,
  summary           text,
  content           text not null, -- plain text; paragraphs separated by blank lines
  tags              text[] not null default '{}',
  is_published      boolean not null default true,
  view_count        int not null default 0,
  helpful_count     int not null default 0,
  not_helpful_count int not null default 0,
  sort_order        int not null default 0,
  search_vector     tsvector generated always as (
                      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                      setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
                      setweight(to_tsvector('english', coalesce(content, '')), 'C')
                    ) stored,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (category_id, slug)
);

create index if not exists support_articles_category_idx on public.support_articles (category_id, sort_order);
create index if not exists support_articles_search_idx on public.support_articles using gin (search_vector);

alter table public.support_articles enable row level security;

drop policy if exists "published articles are publicly readable" on public.support_articles;
create policy "published articles are publicly readable" on public.support_articles
  for select using (is_published = true);

-- ── 3. support_article_feedback ────────────────────────────────────────
create table if not exists public.support_article_feedback (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid not null references public.support_articles(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  is_helpful  boolean not null,
  created_at  timestamptz not null default now(),
  unique (article_id, user_id)
);

alter table public.support_article_feedback enable row level security;

drop policy if exists "users can view their own feedback" on public.support_article_feedback;
create policy "users can view their own feedback" on public.support_article_feedback
  for select using (auth.uid() = user_id);

drop policy if exists "users can submit feedback" on public.support_article_feedback;
create policy "users can submit feedback" on public.support_article_feedback
  for insert with check (auth.uid() = user_id);

drop policy if exists "users can update their own feedback" on public.support_article_feedback;
create policy "users can update their own feedback" on public.support_article_feedback
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── 4. support_tickets ──────────────────────────────────────────────────
create table if not exists public.support_tickets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  category_id    uuid references public.support_categories(id) on delete set null,
  subject        text not null,
  message        text not null,
  contact_email  text,
  status         text not null default 'open'   check (status in ('open', 'in_progress', 'resolved', 'closed')),
  priority       text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists support_tickets_user_idx on public.support_tickets (user_id, created_at desc);

alter table public.support_tickets enable row level security;

drop policy if exists "users can view their own tickets" on public.support_tickets;
create policy "users can view their own tickets" on public.support_tickets
  for select using (auth.uid() = user_id);

drop policy if exists "users can create their own tickets" on public.support_tickets;
create policy "users can create their own tickets" on public.support_tickets
  for insert with check (auth.uid() = user_id);

-- ── 5. updated_at trigger for tickets ───────────────────────────────────
create or replace function public.set_support_ticket_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists support_tickets_set_updated_at on public.support_tickets;
create trigger support_tickets_set_updated_at
  before update on public.support_tickets
  for each row execute function public.set_support_ticket_updated_at();

-- ── 6. increment_support_article_view RPC ──────────────────────────────
-- Runs as the function owner (security definer) so anon/authenticated
-- clients can bump the counter without an UPDATE grant on the table.
create or replace function public.increment_support_article_view(p_article_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.support_articles
    set view_count = view_count + 1
    where id = p_article_id and is_published = true;
end;
$$;

grant execute on function public.increment_support_article_view(uuid) to anon, authenticated;

-- ── 7. search_support_articles RPC ─────────────────────────────────────
-- Ranked full-text search over published articles using websearch syntax
-- (supports quoted phrases, `-exclude`, `OR`, etc.).
create or replace function public.search_support_articles(p_query text)
returns table (
  id uuid,
  category_id uuid,
  slug text,
  title text,
  summary text,
  tags text[],
  view_count int,
  helpful_count int,
  not_helpful_count int,
  rank real
)
language sql
security definer
set search_path = public
stable
as $$
  select
    a.id, a.category_id, a.slug, a.title, a.summary, a.tags,
    a.view_count, a.helpful_count, a.not_helpful_count,
    ts_rank(a.search_vector, websearch_to_tsquery('english', p_query)) as rank
  from public.support_articles a
  where a.is_published = true
    and a.search_vector @@ websearch_to_tsquery('english', p_query)
  order by rank desc
  limit 30;
$$;

grant execute on function public.search_support_articles(text) to anon, authenticated;

-- ── 8. Seed starter categories + articles ──────────────────────────────
insert into public.support_categories (slug, name, description, icon, sort_order) values
  ('getting-started', 'Getting Started',    'Creating your account and finding your way around Chillverse.', 'Rocket',      0),
  ('account',         'Account & Profile',  'Managing your username, profile, and login.',                   'UserCircle',  1),
  ('games',           'Games',              'How to play, rules, and troubleshooting gameplay.',              'Gamepad2',    2),
  ('economy',         'Diamonds & Mall',    'Buying diamonds, the Mall, and item unlocks.',                    'Gem',         3),
  ('social',          'Chat & Social',      'Friends, chat, crews, and referrals.',                            'Users',       4),
  ('billing',         'Pro & Billing',      'Chillverse Pro subscriptions and payments.',                      'CreditCard',  5),
  ('safety',          'Safety & Reports',   'Reporting players and staying safe on Chillverse.',               'ShieldCheck', 6)
on conflict (slug) do nothing;

insert into public.support_articles (category_id, slug, title, summary, content, tags, sort_order)
select c.id, v.slug, v.title, v.summary, v.content, v.tags, v.sort_order
from (values
  ('getting-started', 'creating-an-account', 'Creating your Chillverse account',
    'How to sign up and set up your profile for the first time.',
    E'Signing up for Chillverse is free and takes less than a minute.\n\nTap "Sign Up" on the home screen, choose a username, and enter your date of birth and country. You can optionally connect a platform to personalize your experience.\n\nOnce you''re in, head to your Profile to add a bio, pick an avatar, and choose your favorite game. Your account is created instantly — no email verification is required to start playing.',
    array['signup','account','onboarding'], 0),
  ('getting-started', 'navigating-the-dashboard', 'Finding your way around the Dashboard',
    'A quick tour of the Dashboard and sidebar.',
    E'Your Dashboard is the home base for everything happening on Chillverse — recent activity, quick links to games, and your current streak.\n\nUse the sidebar on the left (or the menu button on mobile) to jump between Games, Mall, Chat, Profile, and Settings. Sections with sub-pages, like Games and Mall, expand when tapped.\n\nYour XP, level, and diamond balance are always visible near the top so you can track your progress at a glance.',
    array['dashboard','navigation'], 1),
  ('account', 'changing-your-username', 'Changing your username',
    'Username rules and how often you can change it.',
    E'You can change your username from Settings → Edit Profile.\n\nUsernames must be 3–20 characters, and can only contain letters, numbers, underscores, and hyphens. They can''t start or end with an underscore or hyphen, and can''t use reserved or restricted words.\n\nTo prevent impersonation, you can only change your username once every 30 days. The app will show you how many days remain if you''re still in the cooldown period.',
    array['username','profile'], 0),
  ('account', 'resetting-your-password', 'Resetting your password',
    'Steps to recover access if you forget your password.',
    E'If you''ve forgotten your password, tap "Forgot password?" on the login screen and enter the email address linked to your account.\n\nYou''ll receive a password reset link by email. Follow it to set a new password. If you don''t see the email within a few minutes, check your spam folder before requesting another one.',
    array['password','login','security'], 1),
  ('games', 'how-to-play-whot', 'How to play Whot on Chillverse',
    'Rules and tips for the classic Nigerian card game.',
    E'Whot is played with a deck of numbered and shape cards. Match the number or shape of the top card to play, or draw from the pile if you can''t.\n\nSpecial cards change the flow of the game — for example, some skip the next player and others force them to pick up extra cards. The first player to clear their hand wins the round and earns XP.\n\nXP earned scales with how quickly you win and how many opponents you beat.',
    array['whot','games','rules'], 0),
  ('economy', 'buying-diamonds', 'Buying diamonds',
    'How diamonds work and how to top up your balance.',
    E'Diamonds are Chillverse''s in-app currency, used in the Mall to unlock cosmetic items like avatar skins, profile pictures, and chat themes.\n\nGo to Wallet → Buy Diamonds to choose a top-up amount and complete payment. Diamonds are added to your balance immediately after a successful payment.\n\nDiamonds are cosmetic-only — they never affect gameplay, matchmaking, or XP earned.',
    array['diamonds','mall','payments'], 0),
  ('billing', 'chillverse-pro-plans', 'What''s included in Chillverse Pro',
    'Orbit vs Void tiers and what they unlock.',
    E'Chillverse Pro comes in two tiers: Orbit and Void, each available as a monthly or yearly subscription.\n\nPro removes session limits, unlocks the Halo AI companion at higher tiers, and gives access to exclusive cosmetic items in the Mall. Void includes everything in Orbit plus additional perks for the most active players.\n\nYou can manage or cancel your subscription any time from Settings → Pro.',
    array['pro','subscription','billing'], 0),
  ('safety', 'reporting-a-player', 'Reporting a player',
    'How to report abusive behavior or cheating.',
    E'If another player is breaking the rules — harassment, cheating, or inappropriate content — you can report them from their profile page or directly from a chat conversation using the report option.\n\nReports are reviewed by the Chillverse team. Repeat or severe violations can lead to warnings, temporary suspensions, or a permanent ban.\n\nIf you feel unsafe, you can also block a player from Settings, which prevents them from messaging you or inviting you to games.',
    array['safety','reporting','moderation'], 0)
) as v(cat_slug, slug, title, summary, content, tags, sort_order)
join public.support_categories c on c.slug = v.cat_slug
on conflict (category_id, slug) do nothing;
