-- Customer order notifications — durable send ledger.
--
-- NOT APPLIED. This migration is prepared, reviewed and held for explicit authorisation; the
-- application refuses to send any customer email while this table is absent, so nothing can be sent
-- by accident before it is applied.
--
-- Why a table rather than a column: "exactly one logical confirmation per purchase" has to survive
-- webhook retries, concurrent deliveries and a process crash between sending and recording. A unique
-- row per (order, kind) claimed BEFORE the send is what makes that true; the row also carries the
-- provider's message id so a real send can be reconciled against Brevo.

create table if not exists public.ut_order_notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.ut_orders(id) on delete cascade,
  kind text not null check (kind in ('confirmation', 'payment_failed', 'shipped')),
  status text not null default 'sending' check (status in ('sending', 'sent', 'failed', 'skipped')),
  attempts integer not null default 1,
  provider text,
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, kind)
);

create index if not exists ut_order_notifications_order_idx on public.ut_order_notifications (order_id);
create index if not exists ut_order_notifications_status_idx on public.ut_order_notifications (status);

-- Only the service role writes or reads this table.
alter table public.ut_order_notifications enable row level security;
-- No policies are created: with RLS on and no policy, the anon and authenticated roles see nothing,
-- while the service role (which bypasses RLS) performs the ledger writes and the webhook reads.
