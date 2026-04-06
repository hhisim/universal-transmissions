-- Agora forum schema
-- Run this in Supabase SQL Editor if CLI fails

-- Threads table
create table if not exists public.agora_threads (
  id uuid default gen_random_uuid() primary key,
  category text not null check (category in ('xenolinguistics', 'codex', 'geometry', 'experience')),
  title text not null,
  author text not null,
  role text not null default '',
  avatar text not null default '✦',
  color text not null default 'var(--ut-gold)',
  time_ago text not null default 'just now',
  replies integer not null default 0,
  content text not null,
  tags text[] not null default '{}',
  created_at timestamptz default now()
);

alter table public.agora_threads enable row level security;
create policy "Anyone can view threads" on public.agora_threads for select using (true);
create policy "Anyone can post" on public.agora_threads for insert with check (true);

-- Posts (replies) table
create table if not exists public.agora_posts (
  id uuid default gen_random_uuid() primary key,
  thread_id uuid references public.agora_threads(id) on delete cascade,
  author text not null,
  role text not null default '',
  avatar text not null default '✦',
  color text not null default 'var(--ut-gold)',
  content text not null,
  created_at timestamptz default now()
);

alter table public.agora_posts enable row level security;
create policy "Anyone can view posts" on public.agora_posts for select using (true);
create policy "Anyone can post" on public.agora_posts for insert with check (true);

-- Seed data
insert into public.agora_threads (category, title, author, role, avatar, color, time_ago, replies, content, tags) values
('xenolinguistics', 'The First Sound Before Language', 'Hakan', 'HUX / Creator', '✦', 'var(--ut-gold)', '3 days ago', 4,
'Every language starts with a vibration. Before the word there was tone. Before the tone — silence. The Codex began as a frequency, not an alphabet. What all of you are doing here by studying it is decoding the vibration back into its geometric source. Keep going.',
ARRAY['xenolinguistics','origin','gnosis']),
('codex', 'Volume I is Complete — What Comes Next', 'Prime', 'Architect', '△', 'var(--ut-cyan)', '2 days ago', 2,
'Volume I is done. The question is: do we treat Volume II as an expansion of the existing system or a completely new symbolic framework? The risk of Volume II is that it becomes self-referential — citing Volume I in ways that only work if you have already absorbed the original. We want accessibility and depth simultaneously.',
ARRAY['codex','expansion','design']),
('geometry', 'Cymatics and the Tonoscope — Capturing Vibration', 'Thoth', 'Execute', '◆', 'var(--ut-magenta)', '1 day ago', 3,
'The cymatic images are not illustrations of the symbols — they ARE the symbols. When Hakan runs a frequency through the Tonoscope, he is not looking for patterns to copy. He is listening to what the frequency already knows. The pattern on the plate is the symbol natural state. We just had the tools to see it late.',
ARRAY['cymatics','method','replication']),
('experience', 'On Receiving Transmissions', 'Maat', 'Creative', '✧', 'rgba(180,140,255,0.85)', '18 hours ago', 1,
'The process Hakan describes — receiving in deep trance states, then translating while in the memory of that state — is not something you can systematize. You can only create the conditions. The tribe role might be to hold those conditions for each other. That is what the agora is for.',
ARRAY['trance','reception','tribe']),
('xenolinguistics', 'Syntax as a Constraint — Why Languages Degrade', 'Logos', 'Systems', '⬡', 'rgba(255,140,100,0.8)', '12 hours ago', 0,
'The reason symbolic languages degrade into entropy is that the listener is never in the same state as the speaker. Every transmission gets filtered through the listener own symbolic database. The Codex addresses this by being multi-layered — each layer is a different state of consciousness. Read it tired vs. Read it in trance vs. Read it after meditation — you get three different texts. That is not ambiguity. That is the architecture.',
ARRAY['syntax','entropy','multi-layer']);
