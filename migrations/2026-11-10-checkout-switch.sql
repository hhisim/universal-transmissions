-- UT post-release stabilisation — checkout switch and flag audit.
--
-- APPLY THIS BEFORE THE MAINTENANCE BRANCH IS PROMOTED.
-- Additive only: two new tables, no existing table is read, altered or rewritten.
--
-- Until it is applied, the checkout switch degrades to the CHECKOUT_DISABLED environment variable
-- and, absent that, to enabled — see src/lib/checkout-switch.ts. It does NOT fail the storefront.

create table if not exists public.ut_system_flags (
  key         text primary key,
  enabled     boolean     not null default true,
  reason      text,
  updated_at  timestamptz not null default now()
);

comment on table public.ut_system_flags is
  'Runtime switches that must change without a deployment. One row per switch.';

-- The shop starts open. This row is the explicit record that it was never closed.
insert into public.ut_system_flags (key, enabled, reason, updated_at)
values ('checkout_enabled', true, 'initial state', now())
on conflict (key) do nothing;

create table if not exists public.ut_flag_audit (
  id          bigserial primary key,
  key         text        not null,
  action      text        not null,          -- read | enable | disable | toggle
  outcome     text        not null,          -- applied | refused
  actor_ip    text,
  actor_note  text,
  detail      jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists ut_flag_audit_key_created_idx
  on public.ut_flag_audit (key, created_at desc);

comment on table public.ut_flag_audit is
  'Every attempt to read or change a runtime flag, including refused attempts.';

-- Neither table is client-readable. The service role bypasses RLS; the anon and authenticated
-- roles must not see them at all.
alter table public.ut_system_flags enable row level security;
alter table public.ut_flag_audit   enable row level security;

-- No policies are created on purpose: with RLS enabled and no policy, every non-service-role
-- request is denied. Adding a policy later would be an explicit decision, not an accident.

-- ── Order status vocabulary ──────────────────────────────────────────────────
-- Task A introduces one new status value: 'expired'.
-- Existing rows are NOT rewritten by this migration; the value is only ever set by the webhook
-- when Stripe confirms a session expired and the row is still pending.
comment on column public.ut_orders.status is
  'pending | paid | cancelled | fulfilled | expired — expired is set only for sessions Stripe confirms are expired, and never over paid/fulfilled.';
