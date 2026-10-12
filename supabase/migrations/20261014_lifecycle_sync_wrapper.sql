-- =====================================================================
-- 20261014_lifecycle_sync_wrapper.sql
--
-- PROTOTYPE — NOT APPLIED, NOT WIRED INTO THE APPLICATION.
-- No production policy is selected by this file.
--
-- A SEPARATE, SQL-ONLY synchronization wrapper around the UNCHANGED reviewed
-- RPC public.apply_lifecycle_update(jsonb) (20261012_apply_lifecycle_update.sql).
-- That migration is not modified, not redefined, and not replaced here.
--
-- DEPENDS ON the key helpers in 20261013_lifecycle_linkage_sync.sql
-- (b14ab_linkage_key, b14ab_linkage_keys, b14ab_acquire_global_lock). The
-- harness applies that file first and asserts the dependency is present rather
-- than assuming it.
--
-- WHY A WRAPPER
-- -------------
-- The reviewed RPC re-locates linkage under FOR UPDATE and commits. A row lock
-- does not block an INSERT, and a relink of a row the re-location did not find
-- is covered by no lock at all, so a competing writer can commit a linkage
-- between the re-location and the commit. The RPC cannot close this by itself:
-- it cannot lock rows that do not exist yet.
--
-- The wrapper takes the advisory key set for BOTH targets across BOTH the
-- declared (new) linkage and every entry's original linkage, THEN calls the
-- reviewed RPC. Ordering is: advisory keys -> the RPC's own row locking.
--
-- It changes nothing about the RPC's contract: outcomes, the located-set
-- snapshot validation, exact coverage, the writable-column allow-list and the
-- all-or-nothing rollback all remain the RPC's. The wrapper adds no writes.
--
-- EXECUTION BOUNDARY
-- ------------------
-- Both wrappers are SECURITY INVOKER. SECURITY DEFINER is NOT needed: the wrapper
-- makes no privileged access of its own — it takes advisory locks (available to
-- every role) and calls the reviewed RPC, which is itself SECURITY DEFINER and
-- therefore runs its body as its owner regardless of the caller. An INVOKER
-- wrapper therefore executes with the caller's privileges, which is the tighter
-- arrangement, and EXECUTE is withheld from PUBLIC/anon/authenticated.
--
-- The whole file is ONE TRANSACTION: function creation, ownership and the
-- execution ACLs commit together or not at all, so a failure part-way through
-- cannot leave a callable function with default (PUBLIC) execute rights behind.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- (1) The key set for a whole payload.
--
-- Covers, for every target: the declared linkage (customer_id and every
-- subscription_ids entry) and every entry's ORIGINAL linkage
-- (original.stripe_customer_id, original.stripe_subscription_id). The old side
-- matters: a relink away from an identity must serialise against writers still
-- targeting that identity.
-- ---------------------------------------------------------------------

create or replace function public.b14ac_linkage_keys_for_payload(p_targets jsonb)
returns bigint[]
language plpgsql
immutable
as $$
declare
  v_target jsonb;
  v_entry  jsonb;
  v_val    text;
  v_keys   bigint[] := array[]::bigint[];
begin
  if p_targets is null or jsonb_typeof(p_targets) <> 'array' then
    return array[]::bigint[];
  end if;

  for v_target in select jsonb_array_elements(p_targets) loop

    v_val := nullif(v_target->'linkage'->>'customer_id', '');
    if v_val is not null then
      v_keys := v_keys || public.b14ab_linkage_key('customer', v_val);
    end if;

    for v_val in
      select nullif(x, '')
        from jsonb_array_elements_text(
               coalesce(v_target->'linkage'->'subscription_ids', '[]'::jsonb)) x
    loop
      if v_val is not null then
        v_keys := v_keys || public.b14ab_linkage_key('subscription', v_val);
      end if;
    end loop;

    for v_entry in select jsonb_array_elements(coalesce(v_target->'entries', '[]'::jsonb)) loop
      -- The ORIGINAL linkage the entry was snapshotted against: relinking AWAY
      -- from an identity must serialise against writers still targeting it.
      v_val := nullif(v_entry->'original'->>'stripe_customer_id', '');
      if v_val is not null then
        v_keys := v_keys || public.b14ab_linkage_key('customer', v_val);
      end if;
      v_val := nullif(v_entry->'original'->>'stripe_subscription_id', '');
      if v_val is not null then
        v_keys := v_keys || public.b14ab_linkage_key('subscription', v_val);
      end if;

      -- The REPLACEMENT linkage this entry INSTALLS. A write that locates a row
      -- through identity A but sets its linkage to B is MOVING the row to B, so a
      -- concurrent caller targeting B must contend with that move. Without these
      -- keys the move is invisible to a writer holding only B.
      -- A JSON null is an explicit NULL replacement: it names no identity and
      -- therefore contributes no key.
      if v_entry ? 'set' then
        v_val := nullif(v_entry->'set'->>'stripe_customer_id', '');
        if v_val is not null then
          v_keys := v_keys || public.b14ab_linkage_key('customer', v_val);
        end if;
        v_val := nullif(v_entry->'set'->>'stripe_subscription_id', '');
        if v_val is not null then
          v_keys := v_keys || public.b14ab_linkage_key('subscription', v_val);
        end if;
      end if;
    end loop;

  end loop;

  -- Deduplicated and ASCENDING: that order is the acquisition order, so two
  -- payloads with overlapping identities acquire shared keys in the same
  -- sequence and cannot deadlock against each other.
  return (select coalesce(array_agg(distinct k order by k), array[]::bigint[])
            from unnest(v_keys) k);
end
$$;

-- ---------------------------------------------------------------------
-- (2) The synchronized entry point.
--
-- Keys first, then the reviewed RPC unchanged. Same signature, same outcome
-- columns, so a caller can be switched between them without other changes.
-- ---------------------------------------------------------------------

create or replace function public.apply_lifecycle_update_sync(p_targets jsonb)
returns table (
  target       text,
  outcome      text,
  affected     integer,
  located_pks  uuid[]
)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_keys bigint[];
  k      bigint;
begin
  v_keys := public.b14ac_linkage_keys_for_payload(p_targets);
  foreach k in array v_keys loop
    perform pg_advisory_xact_lock(k);
  end loop;

  return query select * from public.apply_lifecycle_update(p_targets);
end
$$;

-- ---------------------------------------------------------------------
-- (2b) The TRIGGER-ALIGNED entry point.
--
-- The trigger candidates take ONE GLOBAL key, which a per-identity writer does
-- NOT hold. The two therefore do not compose: a direct writer blocked by the
-- trigger is not blocked by apply_lifecycle_update_sync. This entry point takes
-- the same single global key exclusively, so the RPC path and the trigger path
-- contend on the SAME lock, which is the only way the trigger can cover writers
-- that bypass the RPC.
--
-- This is a SEPARATE CANDIDATE, not a replacement: per-identity keys are precise
-- but cooperative, the global key covers non-participants but is coarse.
-- ---------------------------------------------------------------------

create or replace function public.apply_lifecycle_update_sync_global(p_targets jsonb)
returns table (
  target       text,
  outcome      text,
  affected     integer,
  located_pks  uuid[]
)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  perform public.b14ab_acquire_global_lock(false);
  return query select * from public.apply_lifecycle_update(p_targets);
end
$$;

-- ---------------------------------------------------------------------
-- (3) TRIGGER CANDIDATES — for direct SQL writers that do not call any RPC.
--
-- A statement-level BEFORE trigger fires before the statement touches a row,
-- so the key is taken BEFORE any row lock: the same order as the wrapper, which
-- is what keeps the two paths from deadlocking.
--
-- These must use ONE GLOBAL key. A statement-level trigger cannot derive
-- per-identity keys — it has no access to the rows the statement will affect —
-- so the granularity cost is inherent to this route and is reported, not hidden.
--
-- Two modes are provided as SEPARATE CANDIDATES, because they have different
-- upgrade behaviour:
--   shared    writers share a read-style key; the RPC takes it exclusive.
--             Cheap for writers, BUT a transaction that already holds it
--             shared and then requests it exclusive can deadlock against
--             another transaction doing the same upgrade.
--   exclusive writers serialise against each other; no upgrade is possible,
--             so the upgrade deadlock cannot arise.
-- ---------------------------------------------------------------------

create or replace function public.b14ac_trg_stmt_shared() returns trigger
language plpgsql
as $$
begin
  perform public.b14ab_acquire_global_lock(true);
  return null;
end
$$;

create or replace function public.b14ac_trg_stmt_exclusive() returns trigger
language plpgsql
as $$
begin
  perform public.b14ab_acquire_global_lock(false);
  return null;
end
$$;

-- Installed by the harness only. Installing a trigger is the policy decision
-- under review; this file deliberately does not make it.
create or replace function public.b14ac_install_trigger(p_mode text)
returns text
language plpgsql
as $$
begin
  drop trigger if exists b14ac_stmt_trg on public.ut_members;
  drop trigger if exists b14ac_stmt_trg on public.profiles;
  if p_mode = 'shared' then
    create trigger b14ac_stmt_trg before insert or update on public.ut_members
      for each statement execute function public.b14ac_trg_stmt_shared();
    create trigger b14ac_stmt_trg before insert or update on public.profiles
      for each statement execute function public.b14ac_trg_stmt_shared();
    return 'shared';
  elsif p_mode = 'exclusive' then
    create trigger b14ac_stmt_trg before insert or update on public.ut_members
      for each statement execute function public.b14ac_trg_stmt_exclusive();
    create trigger b14ac_stmt_trg before insert or update on public.profiles
      for each statement execute function public.b14ac_trg_stmt_exclusive();
    return 'exclusive';
  elsif p_mode = 'none' then
    return 'none';
  end if;
  raise exception 'unknown trigger mode: %', p_mode using errcode = '22023';
end
$$;

-- ---------------------------------------------------------------------
-- (4) OWNERSHIP AND EXECUTION ACLs — inside the same transaction.
--
-- PostgreSQL grants EXECUTE to PUBLIC on new functions, so the revokes are
-- load-bearing: without them every role could drive entitlement writes through
-- the wrapper. Ownership is pinned explicitly rather than left to whoever ran
-- the migration.
-- ---------------------------------------------------------------------

alter function public.apply_lifecycle_update_sync(jsonb)        owner to postgres;
alter function public.apply_lifecycle_update_sync_global(jsonb) owner to postgres;

comment on function public.apply_lifecycle_update_sync(jsonb) is
  'Batch 14ac/14ad: takes the payload''s advisory key set (declared, original AND replacement identities) then calls the unchanged reviewed RPC. Prototype: not applied, not wired into the application.';
comment on function public.apply_lifecycle_update_sync_global(jsonb) is
  'Batch 14ac/14ad: takes the single GLOBAL key then calls the unchanged reviewed RPC. The trigger candidates take the same key, so this is the entry point a trigger can cover. Prototype: not applied, not wired in.';

revoke all on function public.apply_lifecycle_update_sync(jsonb)        from public;
revoke all on function public.apply_lifecycle_update_sync(jsonb)        from anon;
revoke all on function public.apply_lifecycle_update_sync(jsonb)        from authenticated;
revoke all on function public.apply_lifecycle_update_sync_global(jsonb) from public;
revoke all on function public.apply_lifecycle_update_sync_global(jsonb) from anon;
revoke all on function public.apply_lifecycle_update_sync_global(jsonb) from authenticated;

grant execute on function public.apply_lifecycle_update_sync(jsonb)        to service_role;
grant execute on function public.apply_lifecycle_update_sync_global(jsonb) to service_role;

-- The trigger installer is policy, not a read helper: it is not exposed to
-- anonymous or authenticated callers either.
revoke all on function public.b14ac_install_trigger(text) from public;
revoke all on function public.b14ac_install_trigger(text) from anon;
revoke all on function public.b14ac_install_trigger(text) from authenticated;

commit;
