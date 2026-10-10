-- Batch 13 fixture: DEPLOYED state, reproduced exactly, inside database b13test.
-- bytes|type|default for every column come from information_schema.columns on
-- opixpkquyapeqdceyczs; ACLs and policies come from the catalog read.

-- ── auth shims: Supabase's auth.uid()/auth.role() read the request JWT claims ──
create schema if not exists auth;

create or replace function auth.uid() returns uuid
language sql stable as $fn$
  select coalesce(
           nullif(current_setting('request.jwt.claim.sub', true), ''),
           nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
         )::uuid
$fn$;

create or replace function auth.role() returns text
language sql stable as $fn$
  select coalesce(
           nullif(current_setting('request.jwt.claim.role', true), ''),
           nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
         )
$fn$;

grant usage on schema auth to anon, authenticated, service_role;

-- ── tables, exactly the deployed shapes ──────────────────────────────────────
create table public.profiles (
  user_id               uuid        not null,
  email                 text,
  display_name          text,
  plan                  text        not null default 'guest',
  subscription_status   text        not null default 'inactive',
  stripe_customer_id    text,
  stripe_subscription_id text,
  price_id              text,
  current_period_end    timestamptz,
  preferred_lang        text        not null default 'en',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  trial_ends_at         timestamptz,
  promo_source          text,
  constraint profiles_pkey primary key (user_id)
);

create table public.ut_members (
  id                     uuid not null default gen_random_uuid(),
  email                  text not null,
  plan                   text default 'guest',
  subscription_status    text,
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_end     timestamptz,
  created_at             timestamptz default now(),
  updated_at             timestamptz,
  constraint ut_members_pkey primary key (id)
);

-- ── deployed ACLs: anon and authenticated hold ALL table privileges ──────────
-- (production relacl = {postgres=arwdDxtm, anon=arwdDxtm, authenticated=arwdDxtm,
--  service_role=arwdDxtm}; MAINTAIN 'm' is PG17-only and absent on this PG16 box)
grant all on public.profiles   to anon, authenticated, service_role;
grant all on public.ut_members to anon, authenticated, service_role;

-- ── deployed RLS: enabled, not forced ────────────────────────────────────────
alter table public.profiles   enable row level security;
alter table public.ut_members enable row level security;

-- ── deployed policies, verbatim ──────────────────────────────────────────────
create policy srv_profiles on public.profiles
  for all to public
  using (auth.role() = 'service_role'::text)
  with check (auth.role() = 'service_role'::text);

create policy "Service role full access" on public.ut_members
  for all to public
  using (auth.role() = 'service_role'::text)
  with check (auth.role() = 'service_role'::text);

create policy srv_ut_members on public.ut_members
  for all to public
  using (auth.role() = 'service_role'::text)
  with check (auth.role() = 'service_role'::text);

-- THE DEFECT: any authenticated user, no ownership predicate
create policy allow_authenticated_read on public.ut_members
  for select to public
  using (auth.uid() is not null);

-- ── synthetic rows only (never production data) ──────────────────────────────
insert into public.profiles (user_id, email, plan, subscription_status, stripe_customer_id) values
  ('11111111-1111-1111-1111-111111111111', 'member-a@example.invalid', 'initiate', 'active', 'cus_SYNTH_A'),
  ('22222222-2222-2222-2222-222222222222', 'member-b@example.invalid', 'free',     'inactive', 'cus_SYNTH_B');

insert into public.ut_members (email, plan, subscription_status, stripe_customer_id) values
  ('member-a@example.invalid', 'initiate', 'active', 'cus_SYNTH_A'),
  ('member-b@example.invalid', 'free',     'inactive', 'cus_SYNTH_B');
