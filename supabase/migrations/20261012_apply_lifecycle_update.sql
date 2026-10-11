-- ============================================================================
-- Batch 14u/14v — atomic lifecycle write contract.
--
-- STATUS: PREPARED AND NOT APPLIED.
--
-- This file is a review candidate. It has been validated only against the
-- isolated harness in scripts/batch14u-rpc-harness.sh. It is NOT applied to any
-- production database, and it is NOT wired into the application: no code path
-- calls it. Applying it is a separately authorized SQL step (a release
-- prerequisite), and an application change may only follow that.
--
-- The whole file is ONE TRANSACTION. Function creation, ownership and the
-- execution grants commit together or not at all, so a failure part-way through
-- applying it cannot leave a half-installed function behind (harness case J).
--
-- WHY THIS EXISTS
-- ---------------
-- The lifecycle handler writes two tables (public.ut_members and
-- public.profiles). PostgREST issues one statement per request, so those two
-- conditional updates are two transactions: one can commit while the other never
-- runs. A per-row conditional UPDATE is already safe under concurrency (the
-- qualification is re-evaluated after the row lock), but that protects one
-- statement, not the pair.
--
-- This function applies the caller's decision for BOTH tables inside ONE
-- transaction, so any conflict aborts both.
--
-- WHAT IT IS NOT
-- --------------
-- It makes no entitlement decisions. It does not read Stripe. It does not
-- resolve linkage policy. It applies a decision the caller already made, and it
-- verifies only that the state that decision was made from is still current.
--
-- OUTCOMES (distinct, never merged)
-- ---------------------------------
--   updated   — the caller's entries were applied; `affected` counts the rows
--   absent    — the linkage owns no row, and owned none when snapshotted
--   skipped   — the linkage owns a row, but the caller chose not to write it
--               (present-but-ineligible); a legitimate no-op, affected = 0
--
-- FAILURES — every one of them aborts the whole transaction
-- --------------------------------------------------------
--   BATCH14 NEWLY_LINKED        40001  the linkage now owns a row the snapshot did not have
--   BATCH14 DISAPPEARED         40001  the linkage no longer owns a row the snapshot had
--   BATCH14 SET_CHANGED         40001  the located set changed in some other way
--   BATCH14 CONFLICT            40001  a row moved since the snapshot (guards no longer match)
--   BATCH14 ENTRY_NOT_LOCATED   40001  an entry names a row this linkage does not own
--   BATCH14 COVERAGE            40001  entries do not cover the located rows exactly
--   BATCH14 INCOMPLETE_UPDATE   40001  internal invariant: fewer rows written than located
--   BATCH14 DUPLICATE_TARGET    22023  the same table appears twice
--   BATCH14 DUPLICATE_PK        22023  the same pk appears twice in one target
--   BATCH14 EMPTY_UPDATE        22023  rows were located but no entries were supplied
--   BATCH14 EMPTY_SET           22023  an update entry would write nothing
--   BATCH14 SKIP_WITH_SET       22023  a skipped entry carries a set
--   BATCH14 MISSING_PK          22023  an entry has no pk
--   BATCH14 INCOMPLETE_SNAPSHOT 22023  an entry omits one of the four guard keys
--   BATCH14 COLUMN_NOT_WRITABLE 22023  a set names a column outside the allow-list
--   BATCH14 PLAN_VOCABULARY     22023  a set names a plan outside the vocabulary
--   BATCH14 NO_LINKAGE          22023  a target carries neither customer nor subscription
--
-- EXACT SNAPSHOT COVERAGE
-- -----------------------
-- For a target that located rows, the caller's entries must cover the located
-- set EXACTLY: every located row gets exactly one entry, and no entry names a row
-- outside it. This is what makes `updated` trustworthy — without it a caller
-- could omit a row and still be told the update succeeded.
--
-- Snapshot validation (is the located set still the one the caller snapshotted?)
-- is SEPARATE from the subset actually selected for UPDATE, which is why a
-- skipped row still has to carry its guards: `skipped` asserts "I looked at this
-- row and chose not to write it", and that claim is checkable.
--
-- An absent snapshot is verified, not trusted: the caller-supplied presence is
-- re-checked against the linkage inside the transaction, so a row that becomes
-- linked after the snapshot is NEWLY_LINKED rather than silently ignored.
--
-- RESIDUAL LIMIT — THE ABSENCE RACES (reproduced, harness cases R1/R2)
-- -------------------------------------------------------------------
-- A row that appears AFTER the re-location but BEFORE this transaction commits is
-- not seen: the re-location holds the rows it FOUND, and a row INSERTED — or a
-- previously unlinked row that another writer LINKS — concurrently is not blocked
-- by a row lock. The call can therefore report `absent` and commit while a
-- matching row now exists.
--
-- NO INDEX CLOSES THIS. The unique-email index constrains INSERTs by EMAIL, while
-- these races are about the LINKAGE appearing: a row with a different email but
-- the same subscription id is not blocked by it at all, and linking an existing
-- row is an UPDATE, not an INSERT. Closing it needs writer synchronization — see
-- "Synchronization proposal" in docs/BATCH14U-ATOMIC-WRITE-CONTRACT.md — which is
-- NOT applied here and is not implemented by this file.
-- ============================================================================

begin;

create or replace function public.apply_lifecycle_update(p_targets jsonb)
returns table (
  target       text,
  outcome      text,
  affected     integer,
  located_pks  uuid[]
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  -- Every column this function may write. Anything else is refused, so a caller
  -- cannot reach a column the lifecycle contract does not own.
  c_writable   constant text[] := array[
    'plan', 'subscription_status', 'stripe_customer_id',
    'stripe_subscription_id', 'current_period_end'
  ];
  -- The existing plan vocabulary. Not extended here.
  c_plan_vocab constant text[] := array['guest', 'free', 'initiate'];

  v_target     jsonb;
  v_name       text;
  v_intent     text;
  v_linkage    jsonb;
  v_customer   text;
  v_subs       text[];
  v_seen       uuid[];
  v_located    uuid[];
  v_entries    jsonb;
  v_entry_pks  uuid[];
  v_entry      jsonb;
  v_pk         uuid;
  v_orig       jsonb;
  v_set        jsonb;
  v_key        text;
  v_n          integer;
  v_affected   integer;
begin
  if p_targets is null
     or jsonb_typeof(p_targets) <> 'array'
     or jsonb_array_length(p_targets) = 0 then
    raise exception 'BATCH14 INVALID_PAYLOAD: p_targets must be a non-empty array'
      using errcode = '22023';
  end if;

  -- No table may be named twice: two objects for one table would let a caller
  -- smuggle a second, unchecked write past the first.
  if exists (
    select 1 from (
      select t->>'target' as n, count(*) as c
        from jsonb_array_elements(p_targets) t
       group by 1 having count(*) > 1
    ) d
  ) then
    raise exception 'BATCH14 DUPLICATE_TARGET: a table is named more than once'
      using errcode = '22023';
  end if;

  for v_target in select jsonb_array_elements(p_targets) loop
    v_name := v_target->>'target';
    if v_name is null or v_name not in ('ut_members', 'profiles') then
      raise exception 'BATCH14 UNKNOWN_TARGET: %', coalesce(v_name, '<null>')
        using errcode = '22023';
    end if;

    v_intent := coalesce(v_target->>'intent', 'update');
    if v_intent not in ('update', 'skip') then
      raise exception 'BATCH14 UNKNOWN_INTENT: %', v_intent using errcode = '22023';
    end if;

    v_linkage  := coalesce(v_target->'linkage', '{}'::jsonb);
    v_customer := nullif(v_linkage->>'customer_id', '');
    v_seen     := array(
      select x::uuid
        from jsonb_array_elements_text(coalesce(v_target->'seen_pks', '[]'::jsonb)) as x
       order by x::uuid
    );

    -- Normalise the subscription ids so the linkage is order-independent.
    v_subs := (
      select coalesce(array_agg(s order by s), '{}')
        from (
          select nullif(x, '') as s
            from jsonb_array_elements_text(coalesce(v_linkage->'subscription_ids', '[]'::jsonb)) as x
        ) q
       where s is not null
    );

    if v_customer is null and coalesce(array_length(v_subs, 1), 0) = 0 then
      raise exception 'BATCH14 NO_LINKAGE: target % carries neither a customer nor a subscription', v_name
        using errcode = '22023';
    end if;

    -- ------------------------------------------------------------------
    -- (1) RE-LOCATE inside the transaction, holding what is found. The only
    -- read, used solely to confirm the caller's snapshot is still current.
    -- ------------------------------------------------------------------
    if v_name = 'ut_members' then
      select coalesce(array_agg(t.id order by t.id), '{}') into v_located
        from (
          select id from public.ut_members
           where (v_customer is not null and stripe_customer_id = v_customer)
              or (stripe_subscription_id is not null and stripe_subscription_id = any(v_subs))
           for update
        ) t;
    else
      select coalesce(array_agg(t.user_id order by t.user_id), '{}') into v_located
        from (
          select user_id from public.profiles
           where (v_customer is not null and stripe_customer_id = v_customer)
              or (stripe_subscription_id is not null and stripe_subscription_id = any(v_subs))
           for update
        ) t;
    end if;

    -- ------------------------------------------------------------------
    -- (2) The snapshot must still describe the located set exactly.
    -- ------------------------------------------------------------------
    if v_located is distinct from v_seen then
      if exists (select 1 from unnest(v_located) x where x <> all (v_seen)) then
        raise exception 'BATCH14 NEWLY_LINKED: target % now owns rows the snapshot did not have', v_name
          using errcode = '40001',
                detail  = format('located=%s seen=%s', v_located, v_seen);
      elsif exists (select 1 from unnest(v_seen) x where x <> all (v_located)) then
        raise exception 'BATCH14 DISAPPEARED: target % no longer owns a row the snapshot had', v_name
          using errcode = '40001',
                detail  = format('located=%s seen=%s', v_located, v_seen);
      end if;
      raise exception 'BATCH14 SET_CHANGED: target % located set changed', v_name
        using errcode = '40001',
              detail  = format('located=%s seen=%s', v_located, v_seen);
    end if;

    if coalesce(array_length(v_located, 1), 0) = 0 then
      target := v_name; outcome := 'absent'; affected := 0; located_pks := v_located;
      return next;
      continue;
    end if;

    -- ------------------------------------------------------------------
    -- (3) SNAPSHOT VALIDATION — independent of which rows get an UPDATE.
    -- ------------------------------------------------------------------
    v_entries := coalesce(v_target->'entries', '[]'::jsonb);
    if jsonb_typeof(v_entries) <> 'array' then
      raise exception 'BATCH14 INVALID_ENTRIES: target % entries must be an array', v_name
        using errcode = '22023';
    end if;

    if exists (select 1 from jsonb_array_elements(v_entries) e where e->>'pk' is null) then
      raise exception 'BATCH14 MISSING_PK: target % has an entry with no pk', v_name
        using errcode = '22023';
    end if;

    if exists (
      select 1 from (
        select e->>'pk' as p, count(*) as c
          from jsonb_array_elements(v_entries) e
         group by 1 having count(*) > 1
      ) d
    ) then
      raise exception 'BATCH14 DUPLICATE_PK: target % repeats a pk', v_name
        using errcode = '22023';
    end if;

    v_entry_pks := array(
      select (e->>'pk')::uuid from jsonb_array_elements(v_entries) e order by 1
    );

    -- An update that located rows but supplied none is a specific mistake and
    -- gets a specific name. A SKIP that supplied none is a coverage failure
    -- below, because every located row would be missing its guards.
    if v_intent = 'update' and coalesce(array_length(v_entry_pks, 1), 0) = 0 then
      raise exception 'BATCH14 EMPTY_UPDATE: target % located % row(s) but supplied no entries',
        v_name, array_length(v_located, 1)
        using errcode = '22023';
    end if;

    -- An entry must belong to the linkage the caller declared.
    if exists (select 1 from unnest(v_entry_pks) x where x <> all (v_located)) then
      raise exception 'BATCH14 ENTRY_NOT_LOCATED: target % has an entry outside the located set', v_name
        using errcode = '40001';
    end if;

    -- EXACT coverage: no located row may be left out. This is what makes
    -- `updated` trustworthy — an omitted row can no longer ride along unseen.
    -- It also covers a SKIP with no guards: every located row would be missing,
    -- so the skip cannot claim it looked at anything.
    if exists (select 1 from unnest(v_located) x where x <> all (v_entry_pks)) then
      raise exception 'BATCH14 COVERAGE: target % omitted a located row', v_name
        using errcode = '40001',
              detail  = format('located=%s entries=%s', v_located, v_entry_pks);
    end if;

    for v_entry in select jsonb_array_elements(v_entries) loop
      v_pk   := (v_entry->>'pk')::uuid;
      v_orig := v_entry->'original';
      v_set  := v_entry->'set';

      -- The original snapshot must be explicit, for skipped rows too. A missing
      -- guard column is not an omitted guard, so all four must be present.
      if v_orig is null
         or not (v_orig ? 'plan'
                 and v_orig ? 'subscription_status'
                 and v_orig ? 'stripe_customer_id'
                 and v_orig ? 'stripe_subscription_id') then
        raise exception 'BATCH14 INCOMPLETE_SNAPSHOT: entry % must carry plan, subscription_status, stripe_customer_id and stripe_subscription_id', v_pk
          using errcode = '22023';
      end if;

      if v_intent = 'skip' then
        if v_set is not null and v_set <> '{}'::jsonb then
          raise exception 'BATCH14 SKIP_WITH_SET: a skipped row (%) carries a set', v_pk
            using errcode = '22023';
        end if;
      else
        if v_set is null or jsonb_typeof(v_set) <> 'object' or v_set = '{}'::jsonb then
          raise exception 'BATCH14 EMPTY_SET: update entry % would write nothing', v_pk
            using errcode = '22023';
        end if;

        for v_key in select jsonb_object_keys(v_set) loop
          if v_key <> all (c_writable) then
            raise exception 'BATCH14 COLUMN_NOT_WRITABLE: %', v_key using errcode = '22023';
          end if;
        end loop;

        if v_set ? 'plan'
           and v_set->>'plan' is not null
           and (v_set->>'plan') <> all (c_plan_vocab) then
          raise exception 'BATCH14 PLAN_VOCABULARY: %', v_set->>'plan' using errcode = '22023';
        end if;
      end if;
    end loop;

    -- ------------------------------------------------------------------
    -- (4) GUARD VALIDATION for EVERY entry, update or skip. The rows are held
    -- from the re-location, so this is a stable read. A skipped row whose
    -- snapshot moved on is a conflict, not a quiet no-op.
    -- ------------------------------------------------------------------
    for v_entry in select jsonb_array_elements(v_entries) loop
      v_pk   := (v_entry->>'pk')::uuid;
      v_orig := v_entry->'original';

      if v_name = 'ut_members' then
        select count(*) into v_n from public.ut_members r
         where r.id = v_pk
           and r.plan                   is not distinct from v_orig->>'plan'
           and r.subscription_status    is not distinct from v_orig->>'subscription_status'
           and r.stripe_customer_id     is not distinct from v_orig->>'stripe_customer_id'
           and r.stripe_subscription_id is not distinct from v_orig->>'stripe_subscription_id';
      else
        select count(*) into v_n from public.profiles r
         where r.user_id = v_pk
           and r.plan                   is not distinct from v_orig->>'plan'
           and r.subscription_status    is not distinct from v_orig->>'subscription_status'
           and r.stripe_customer_id     is not distinct from v_orig->>'stripe_customer_id'
           and r.stripe_subscription_id is not distinct from v_orig->>'stripe_subscription_id';
      end if;

      if v_n = 0 then
        raise exception 'BATCH14 CONFLICT: target % pk % no longer matches the snapshot', v_name, v_pk
          using errcode = '40001';
      end if;
    end loop;

    if v_intent = 'skip' then
      target := v_name; outcome := 'skipped'; affected := 0; located_pks := v_located;
      return next;
      continue;
    end if;

    -- ------------------------------------------------------------------
    -- (5) APPLY the subset selected for UPDATE, still conditioned on the
    -- snapshot so a writer that slips past the phase-4 read cannot be lost.
    -- ------------------------------------------------------------------
    v_affected := 0;
    for v_entry in select jsonb_array_elements(v_entries) loop
      v_pk   := (v_entry->>'pk')::uuid;
      v_orig := v_entry->'original';
      v_set  := v_entry->'set';

      if v_name = 'ut_members' then
        update public.ut_members r set
          plan                   = case when v_set ? 'plan' then v_set->>'plan' else r.plan end,
          subscription_status    = case when v_set ? 'subscription_status' then v_set->>'subscription_status' else r.subscription_status end,
          stripe_customer_id     = case when v_set ? 'stripe_customer_id' then v_set->>'stripe_customer_id' else r.stripe_customer_id end,
          stripe_subscription_id = case when v_set ? 'stripe_subscription_id' then v_set->>'stripe_subscription_id' else r.stripe_subscription_id end,
          current_period_end     = case when v_set ? 'current_period_end' then (v_set->>'current_period_end')::timestamptz else r.current_period_end end
         where r.id = v_pk
           and r.plan                   is not distinct from v_orig->>'plan'
           and r.subscription_status    is not distinct from v_orig->>'subscription_status'
           and r.stripe_customer_id     is not distinct from v_orig->>'stripe_customer_id'
           and r.stripe_subscription_id is not distinct from v_orig->>'stripe_subscription_id';
      else
        update public.profiles r set
          plan                   = case when v_set ? 'plan' then v_set->>'plan' else r.plan end,
          subscription_status    = case when v_set ? 'subscription_status' then v_set->>'subscription_status' else r.subscription_status end,
          stripe_customer_id     = case when v_set ? 'stripe_customer_id' then v_set->>'stripe_customer_id' else r.stripe_customer_id end,
          stripe_subscription_id = case when v_set ? 'stripe_subscription_id' then v_set->>'stripe_subscription_id' else r.stripe_subscription_id end,
          current_period_end     = case when v_set ? 'current_period_end' then (v_set->>'current_period_end')::timestamptz else r.current_period_end end
         where r.user_id = v_pk
           and r.plan                   is not distinct from v_orig->>'plan'
           and r.subscription_status    is not distinct from v_orig->>'subscription_status'
           and r.stripe_customer_id     is not distinct from v_orig->>'stripe_customer_id'
           and r.stripe_subscription_id is not distinct from v_orig->>'stripe_subscription_id';
      end if;

      get diagnostics v_n = row_count;
      if v_n = 0 then
        -- The row still exists and is still located, but moved since the
        -- snapshot. Raising rolls back BOTH tables' statements.
        raise exception 'BATCH14 CONFLICT: target % pk % no longer matches the snapshot', v_name, v_pk
          using errcode = '40001';
      end if;

      v_affected := v_affected + v_n;
    end loop;

    -- No caller may be told `updated` when a required update was omitted.
    if v_affected <> coalesce(array_length(v_located, 1), 0) then
      raise exception 'BATCH14 INCOMPLETE_UPDATE: target % wrote % of % located rows',
        v_name, v_affected, array_length(v_located, 1)
        using errcode = '40001';
    end if;

    target := v_name; outcome := 'updated'; affected := v_affected; located_pks := v_located;
    return next;
  end loop;
end;
$$;

alter function public.apply_lifecycle_update(jsonb) owner to postgres;

comment on function public.apply_lifecycle_update(jsonb) is
  'Batch 14u/14v: applies a caller-decided lifecycle update for ut_members and profiles in ONE transaction. Not applied, not wired into the application.';

-- ---------------------------------------------------------------------------
-- Execution is service-role only.
--
-- PostgreSQL grants EXECUTE to PUBLIC on new functions, so the revoke is
-- load-bearing: without it every role could drive entitlement writes.
-- ---------------------------------------------------------------------------
revoke all on function public.apply_lifecycle_update(jsonb) from public;
revoke all on function public.apply_lifecycle_update(jsonb) from anon;
revoke all on function public.apply_lifecycle_update(jsonb) from authenticated;
grant execute on function public.apply_lifecycle_update(jsonb) to service_role;

commit;
