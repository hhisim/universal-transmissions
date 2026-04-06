-- RPC functions for oracle question counting
-- These are safer and faster than read-then-write patterns

-- ── Increment daily Oracle usage for a Free user ─────────────────────────────
create or replace function public.increment_oracle_usage(
  p_email text,
  p_date date
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.ut_oracle_usage (email, date, count)
    values (p_email, p_date, 1)
  on conflict (email, date)
    do update set count = ut_oracle_usage.count + 1, updated_at = now();
end;
$$;

-- ── Increment lifetime Oracle usage for a guest ──────────────────────────────
create or replace function public.increment_guest_usage(
  p_anonymous_id uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.ut_guest_usage (anonymous_id, total_count)
    values (p_anonymous_id, 1)
  on conflict (anonymous_id)
    do update set total_count = ut_guest_usage.total_count + 1, updated_at = now();
end;
$$;
