-- =====================================================================
-- 20261013_lifecycle_linkage_sync.sql
--
-- PROTOTYPE — NOT APPLIED. Prepared for isolated review in a private
-- PostgreSQL cluster only. This file is NOT a production migration and
-- is NOT wired into the application.
--
-- The reviewed atomic-write RPC (20261012_apply_lifecycle_update.sql) is
-- UNCHANGED. This prototype is a separate, self-contained artifact that
-- addresses the one gap the RPC cannot close on its own:
--
--   The RPC re-locates linkage under FOR UPDATE and then commits. A row
--   lock does not block an INSERT, and a relink of a row that was not
--   located is not covered by any lock the RPC holds. A competing writer
--   can therefore commit a new or changed linkage BETWEEN the RPC's
--   relocation and its commit, and the RPC will commit a decision based on
--   a linkage set that is no longer current.
--
-- The protocol here is a KEY PROTOCOL:
--
--   1. Every relevant writer derives a key set for the linkage identity it
--      is about to create, change, or replace — covering the OLD linkage and
--      the NEW linkage.
--   2. It acquires those keys BEFORE performing relocation, and therefore
--      before any row lock.
--   3. Keys are acquired in ASCENDING KEY ORDER, so two writers touching
--      overlapping identities cannot deadlock against each other.
--   4. The RPC then takes row locks (FOR UPDATE) inside the same transaction.
--
-- Ordering rule that this prototype commits to (tested in the harness):
--
--        advisory key lock  ->  row lock        (never the reverse)
--
-- Whether that rule holds for a TRIGGER-based writer is exactly what the
-- harness measures, and it is reported rather than assumed.
-- =====================================================================

-- ---------------------------------------------------------------------
-- (1) KEY DERIVATION
-- ---------------------------------------------------------------------

-- A single linkage key. hashtextextended is stable across sessions for a
-- given major version, which hashtext also is; the extended form is used so
-- the full 64-bit advisory key space is available.
create or replace function public.b14ab_linkage_key(p_kind text, p_value text)
returns bigint
language sql
immutable
as $$
  select hashtextextended('b14ab:' || p_kind || ':' || p_value, 0)
$$;

-- The key SET for a linkage change: the OLD identity and the NEW identity,
-- customers and subscriptions, deduplicated and returned in ASCENDING order.
-- Ascending order is not cosmetic — it is the acquisition order that makes
-- overlapping multi-key writers deadlock-free against each other.
create or replace function public.b14ab_linkage_keys(
  p_old_customer     text,
  p_old_subscription text,
  p_new_customer     text,
  p_new_subscription text
) returns bigint[]
language sql
immutable
as $$
  select coalesce(array_agg(distinct k order by k), array[]::bigint[])
  from (
    select public.b14ab_linkage_key('customer', x) as k
      from unnest(array[p_old_customer, p_new_customer]) x
     where x is not null and x <> ''
    union
    select public.b14ab_linkage_key('subscription', x) as k
      from unnest(array[p_old_subscription, p_new_subscription]) x
     where x is not null and x <> ''
  ) s
$$;

-- One global key, used by the trigger-based alternative.
create or replace function public.b14ab_linkage_global_key()
returns bigint
language sql
immutable
as $$ select hashtextextended('b14ab:global:linkage', 0) $$;

-- ---------------------------------------------------------------------
-- (2) LOCK ACQUISITION — before relocation, ascending order
-- ---------------------------------------------------------------------

create or replace function public.b14ab_acquire_linkage_locks(
  p_old_customer     text,
  p_old_subscription text,
  p_new_customer     text,
  p_new_subscription text
) returns bigint[]
language plpgsql
as $$
declare
  keys bigint[];
  k    bigint;
begin
  keys := public.b14ab_linkage_keys(p_old_customer, p_old_subscription,
                                    p_new_customer, p_new_subscription);
  foreach k in array keys loop
    perform pg_advisory_xact_lock(k);
  end loop;
  return keys;
end
$$;

create or replace function public.b14ab_acquire_global_lock(p_shared boolean default false)
returns bigint
language plpgsql
as $$
declare g bigint := public.b14ab_linkage_global_key();
begin
  if p_shared then
    perform pg_advisory_xact_lock_shared(g);
  else
    perform pg_advisory_xact_lock(g);
  end if;
  return g;
end
$$;

-- ---------------------------------------------------------------------
-- (3) THE PROTOTYPE WRITE PATH
--
-- Shape mirrors the reviewed RPC: optional seen-pks staleness check,
-- relocation, then a conditional write — with the key set acquired BEFORE
-- the relocation.
-- ---------------------------------------------------------------------

create or replace function public.b14ab_lifecycle_apply(
  p_old_customer     text,
  p_old_subscription text,
  p_new_customer     text,
  p_new_subscription text,
  p_seen_pks         bigint[],
  p_plan             text,
  p_status           text
) returns table(outcome text, located_pk bigint, keys bigint[])
language plpgsql
as $$
declare
  keys  bigint[];
  v_pk  bigint;
begin
  -- (a) keys FIRST — before relocation, before any row lock
  keys := public.b14ab_acquire_linkage_locks(p_old_customer, p_old_subscription,
                                             p_new_customer, p_new_subscription);

  -- (b) relocation
  select m.id into v_pk
    from public.ut_members m
   where (p_new_customer     is not null and m.customer_id     = p_new_customer)
      or (p_new_subscription is not null and m.subscription_id = p_new_subscription)
   order by m.id
   limit 1
     for update;

  if v_pk is null then
    return query select 'absent'::text, null::bigint, keys;
    return;
  end if;

  -- (c) staleness: a row that appeared after the caller's snapshot must be
  --     reported, not silently written. Preserves the writer-first rejection
  --     control.
  if not (v_pk = any(coalesce(p_seen_pks, array[]::bigint[]))) then
    return query select 'newly_linked'::text, v_pk, keys;
    return;
  end if;

  update public.ut_members m
     set plan = p_plan, subscription_status = p_status
   where m.id = v_pk;

  return query select 'updated'::text, v_pk, keys;
end
$$;

-- The SAME write path with NO keys at all. This is the exposure the reviewed
-- RPC has on its own, kept here so the harness can reproduce the race against
-- a baseline in the same process and the same cluster.
create or replace function public.b14ab_lifecycle_apply_nosync(
  p_old_customer     text,
  p_old_subscription text,
  p_new_customer     text,
  p_new_subscription text,
  p_seen_pks         bigint[],
  p_plan             text,
  p_status           text
) returns table(outcome text, located_pk bigint, keys bigint[])
language plpgsql
as $$
declare
  v_pk bigint;
begin
  select m.id into v_pk
    from public.ut_members m
   where (p_new_customer     is not null and m.customer_id     = p_new_customer)
      or (p_new_subscription is not null and m.subscription_id = p_new_subscription)
   order by m.id
   limit 1
     for update;

  if v_pk is null then
    return query select 'absent'::text, null::bigint, array[]::bigint[];
    return;
  end if;
  if not (v_pk = any(coalesce(p_seen_pks, array[]::bigint[]))) then
    return query select 'newly_linked'::text, v_pk, array[]::bigint[];
    return;
  end if;

  update public.ut_members m
     set plan = p_plan, subscription_status = p_status
   where m.id = v_pk;

  return query select 'updated'::text, v_pk, array[]::bigint[];
end
$$;

-- ---------------------------------------------------------------------
-- (4) TRIGGER-BASED WRITER VARIANT
--
-- This is the proposal the harness tests for LOCK ORDER: a trigger that a
-- DIRECT SQL writer cannot bypass. The RPC takes the key lock and then seeks
-- a row lock; a row trigger on a direct UPDATE takes whatever lock the
-- statement takes and only then runs. Whether those two orders conflict is
-- measured, not assumed.
--
-- Per-identity keys cannot be derived by a statement-level trigger, so the
-- trigger variant uses the ONE global key.
-- ---------------------------------------------------------------------

-- BEFORE ROW: takes the global key per row, after the statement has begun.
create or replace function public.b14ab_trg_row() returns trigger
language plpgsql
as $$
begin
  perform public.b14ab_acquire_global_lock(false);
  return coalesce(new, old);
end
$$;

-- BEFORE STATEMENT: fires before the statement touches any row, so it takes
-- the key BEFORE any row lock. Shared, so writers do not serialise against
-- each other — only against the exclusive holder (the RPC).
create or replace function public.b14ab_trg_stmt() returns trigger
language plpgsql
as $$
begin
  perform public.b14ab_acquire_global_lock(true);
  return null;
end
$$;

-- Installed by the harness, not by this file: installing a trigger is the
-- policy decision under review, and this prototype deliberately does not make
-- it. The harness installs one variant at a time.
create or replace function public.b14ab_install_trigger(p_kind text)
returns text
language plpgsql
as $$
begin
  drop trigger if exists b14ab_row_trg on public.ut_members;
  drop trigger if exists b14ab_stmt_trg on public.ut_members;
  if p_kind = 'row' then
    create trigger b14ab_row_trg before insert or update on public.ut_members
      for each row execute function public.b14ab_trg_row();
    return 'row';
  elsif p_kind = 'stmt' then
    create trigger b14ab_stmt_trg before insert or update on public.ut_members
      for each statement execute function public.b14ab_trg_stmt();
    return 'stmt';
  elsif p_kind = 'none' then
    return 'none';
  end if;
  raise exception 'unknown trigger kind: %', p_kind;
end
$$;
