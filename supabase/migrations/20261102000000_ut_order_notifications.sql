-- Customer notification outbox + unresolved-payment exceptions.
--
-- NOT APPLIED. Prepared and held for explicit authorisation.
--
-- Why an outbox and not a "claim then send" flag: a claim proves we INTENDED to send. It does not
-- prove a message was delivered, it cannot retry, and if the process dies mid-send it leaves a row
-- that is neither sent nor reclaimable. The states below make every one of those cases explicit:
--
--   pending    queued, waiting for next_attempt_at
--   sending    claimed by a worker; claimed_at marks the lease
--   sent       accepted by the provider; provider_message_id recorded
--   failed     provider refused it; retry scheduled with backoff
--   uncertain  the process died, or the request timed out, and we CANNOT know whether Brevo accepted
--              the message. Never auto-resent — resolved only by a human or by delivery-webhook
--              reconciliation. A second copy of a receipt is worse than an alert.
--
-- Delivery outcomes (delivered / bounced / spam) arrive by webhook and are recorded separately from
-- the SEND state: "Brevo accepted it" and "the mailbox accepted it" are different facts.

create table if not exists public.ut_order_notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.ut_orders(id) on delete cascade,
  kind text not null check (kind in ('confirmation', 'payment_failed', 'shipped')),
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed', 'uncertain', 'skipped')),
  attempts integer not null default 0,
  claimed_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  provider text,
  provider_message_id text,
  idempotency_key text not null,
  delivery_status text,
  delivery_updated_at timestamptz,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, kind),
  unique (idempotency_key)
);

create index if not exists ut_order_notifications_due_idx
  on public.ut_order_notifications (next_attempt_at) where status = 'pending';
create index if not exists ut_order_notifications_lease_idx
  on public.ut_order_notifications (claimed_at) where status = 'sending';
create index if not exists ut_order_notifications_message_idx
  on public.ut_order_notifications (provider_message_id);
create index if not exists ut_order_notifications_order_idx
  on public.ut_order_notifications (order_id);

alter table public.ut_order_notifications enable row level security;

-- ── unresolved payments ────────────────────────────────────────────────────────────────────────────
-- A paid Stripe transaction that could not be turned into a valid order must not evaporate when
-- Stripe stops retrying. One row per payment reference, opened by the webhook, closed by a human.
create table if not exists public.ut_order_exceptions (
  id uuid primary key default gen_random_uuid(),
  payment_reference text not null unique,
  provider text not null default 'stripe',
  reason text not null,
  amount_cents integer,
  currency text,
  payload jsonb,
  status text not null default 'open' check (status in ('open', 'recovering', 'resolved', 'dismissed')),
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ut_order_exceptions_open_idx
  on public.ut_order_exceptions (status, created_at desc);

alter table public.ut_order_exceptions enable row level security;
