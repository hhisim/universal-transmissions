-- Migration: Add subscription fields to ut_members + ut_usage table
-- Run this in Supabase SQL Editor or via psql

-- ── Subscription fields on ut_members ──────────────────────────────────────
ALTER TABLE public.ut_members
  ADD COLUMN IF NOT EXISTS plan text DEFAULT 'guest',
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

-- Drop old RLS policies and replace with service-role-only
drop policy if exists "Members can view their own record" on public.ut_members;
drop policy if exists "Anyone can insert their own member record" on public.ut_members;

alter table public.ut_members enable row level security;

create policy "Service role full access"
  on public.ut_members
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ── Usage tracking table for oracle rate limiting ───────────────────────────
create table if not exists public.ut_usage (
  id uuid default gen_random_uuid() primary key,
  usage_key text unique not null,  -- "email:user@example.com:2026-03-26" or "ip:1.2.3.4:2026-03-26"
  email text,
  ip text,
  plan text not null default 'guest',
  count integer not null default 1,
  created_at timestamptz default now()
);

alter table public.ut_usage enable row level security;

create policy "Service role full access to ut_usage"
  on public.ut_usage
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
