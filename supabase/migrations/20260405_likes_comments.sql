-- Likes table
create table if not exists public.ut_likes (
  id uuid default gen_random_uuid() primary key,
  item_type text not null check (item_type in ('gallery', 'journal', 'codex', 'artwork')),
  item_id text not null,
  visitor_id text not null,
  created_at timestamptz default now(),
  unique(item_type, item_id, visitor_id)
);

alter table public.ut_likes enable row level security;

create policy "Anyone can view likes"
  on public.ut_likes for select
  using (true);

create policy "Anyone can like"
  on public.ut_likes for insert
  with check (true);

create policy "Anyone can unlike"
  on public.ut_likes for delete
  using (true);

-- Likes count view
create or replace view public.ut_likes_count as
select item_type, item_id, count(*) as like_count
from public.ut_likes
group by item_type, item_id;

-- Comments table
create table if not exists public.ut_comments (
  id uuid default gen_random_uuid() primary key,
  item_type text not null check (item_type in ('gallery', 'journal', 'artwork')),
  item_id text not null,
  visitor_id text not null,
  author_name text default 'Anonymous',
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.ut_comments enable row level security;

create policy "Anyone can view comments"
  on public.ut_comments for select
  using (true);

create policy "Anyone can comment"
  on public.ut_comments for insert
  with check (true);

create policy "Only visitor can delete own comment"
  on public.ut_comments for delete
  using (visitor_id = current_setting('request.jwt.claims', true)::json->>'sub');
