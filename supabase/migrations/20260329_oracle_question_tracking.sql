-- Migration: Oracle question tracking per user
-- Tracks: ut_oracle_usage (daily counters for Free users)
-- Run in Supabase SQL Editor

-- ── Oracle usage tracking table (daily question counters per user) ──────────
create table if not exists public.ut_oracle_usage (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  date date not null default current_date,
  count integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (email, date)
);

alter table public.ut_oracle_usage enable row level security;

create policy "Service role full access to ut_oracle_usage"
  on public.ut_oracle_usage
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ── Guest question counter (global, keyed by device fingerprint) ─────────────
-- Uses anonymous_id (a UUID stored in localStorage) to track guest question totals
create table if not exists public.ut_guest_usage (
  id uuid default gen_random_uuid() primary key,
  anonymous_id uuid not null unique,
  total_count integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.ut_guest_usage enable row level security;

create policy "Service role full access to ut_guest_usage"
  on public.ut_guest_usage
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
