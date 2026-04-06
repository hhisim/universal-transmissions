-- UT Orders table
create table if not exists public.ut_orders (
  id uuid default gen_random_uuid() primary key,
  stripe_session_id text unique not null,
  stripe_payment_intent_id text,
  customer_email text not null,
  customer_name text,
  product_id text not null,
  product_title text not null,
  amount_cents integer not null,
  currency text default 'usd',
  status text default 'pending' check (status in ('pending', 'paid', 'shipped', 'delivered', 'fulfilled', 'cancelled', 'refunded')),
  shipping_name text,
  shipping_address_line1 text,
  shipping_address_line2 text,
  shipping_city text,
  shipping_state text,
  shipping_postal_code text,
  shipping_country text,
  is_digital boolean default false,
  fulfillment_tracking text,
  fulfillment_carrier text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.ut_orders enable row level security;

create policy "Anyone can view orders by email"
  on public.ut_orders for select
  using (customer_email = current_setting('request.jwt.claims', true)::json->>'email');

create policy "Service role can insert orders"
  on public.ut_orders for insert
  with check (auth.role() = 'service_role');

create policy "Service role can update orders"
  on public.ut_orders for update
  using (auth.role() = 'service_role');

-- UT Members (for oracle access)
create table if not exists public.ut_members (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  name text,
  created_at timestamptz default now(),
  last_login timestamptz,
  oracle_access boolean default false,
  notes text
);

alter table public.ut_members enable row level security;

create policy "Anyone can insert their own member record"
  on public.ut_members for insert
  with check (email = current_setting('request.jwt.claims', true)::json->>'email');

create policy "Members can view their own record"
  on public.ut_members for select
  using (email = current_setting('request.jwt.claims', true)::json->>'email');
