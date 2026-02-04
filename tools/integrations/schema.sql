-- Supabase schema for OpenClaw compact memory

create table if not exists public.yt_knowledge (
  video_id text primary key,
  channel_id text,
  channel text,
  title text,
  url text,
  published_at timestamptz,
  collected_at timestamptz,
  bullets jsonb default '[]'::jsonb,
  key_quotes jsonb default '[]'::jsonb
);

create index if not exists yt_knowledge_published_at_idx on public.yt_knowledge (published_at desc);
create index if not exists yt_knowledge_channel_idx on public.yt_knowledge (channel);

-- Optional: enable RLS if you decide to use anon keys + policies.
-- alter table public.yt_knowledge enable row level security;
