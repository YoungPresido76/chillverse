-- Halo AI redesign: knowledge base, per-player daily usage, and logs.
-- Players table is `profiles` (confirmed -- no separate `players` table exists).

CREATE TABLE IF NOT EXISTS public.chillverse_knowledge (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  content text not null,
  tags text[] default '{}',
  is_active boolean default true,
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.halo_ai_usage (
  player_id uuid not null references public.profiles(id) on delete cascade,
  usage_date date not null default current_date,
  question_count int not null default 0,
  primary key (player_id, usage_date)
);

CREATE TABLE IF NOT EXISTS public.halo_ai_logs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid,
  question text not null,
  answer text not null,
  tool_calls jsonb,
  created_at timestamptz default now()
);

ALTER TABLE public.chillverse_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.halo_ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.halo_ai_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active knowledge" ON public.chillverse_knowledge;
CREATE POLICY "Anyone can read active knowledge" ON public.chillverse_knowledge
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Players can read own usage" ON public.halo_ai_usage;
CREATE POLICY "Players can read own usage" ON public.halo_ai_usage
  FOR SELECT USING (auth.uid() = player_id);

CREATE INDEX IF NOT EXISTS idx_chillverse_knowledge_active ON public.chillverse_knowledge (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_chillverse_knowledge_tags ON public.chillverse_knowledge USING gin (tags);
