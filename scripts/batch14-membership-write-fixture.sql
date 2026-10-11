-- Batch 14 isolated fixture: the deployed schema, reproduced exactly from the
-- production catalog (columns, nullability, defaults, primary keys). Synthetic
-- rows only. No personal data.
drop schema if exists public cascade;
create schema public;

create table public.profiles (
  user_id uuid primary key,
  email text,
  display_name text,
  plan text not null default 'guest',
  subscription_status text not null default 'inactive',
  stripe_customer_id text,
  stripe_subscription_id text,
  price_id text,
  current_period_end timestamptz,
  preferred_lang text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  trial_ends_at timestamptz,
  promo_source text
);

create table public.ut_members (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  plan text default 'guest',
  subscription_status text,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz
);

-- Synthetic rows. Addresses are example.invalid and carry no real identity.
insert into public.profiles (user_id, email, plan) values
  ('11111111-1111-1111-1111-111111111111', 'synthetic-a@example.invalid', 'initiate'),
  ('22222222-2222-2222-2222-222222222222', 'synthetic-b@example.invalid', 'guest');

insert into public.ut_members (email, plan, stripe_customer_id) values
  ('synthetic-a@example.invalid', 'initiate', 'cus_synthetic_a'),
  ('synthetic-b@example.invalid', 'guest', 'cus_synthetic_b');
