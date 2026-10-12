-- Batch 14ah — durable entitlement authority.
--
-- PREPARED AND NOT APPLIED. This is a review candidate. It has been exercised only
-- against the isolated private cluster used by
-- `scripts/batch14ah-durable-authority.js` and the shared webhook harness. It is
-- NOT applied to any production database, and no production configuration changes
-- with it.
--
-- It is DERIVED MECHANICALLY from the two committed candidates it supersedes:
--
--   20261012_apply_lifecycle_update.sql  (the REVIEWED primitive; NOT modified)
--   20261015_lifecycle_per_entry_skip.sql (per-entry skip; superseded here)
--
-- The reviewed file is untouched and remains
-- 251d8e4c3a395bc0b73e64d51127955638c039f4. This file's diff against 20261015 is
-- exactly four changes, nothing else:
--
--   1. a nullable `entitlement_authority_at timestamptz` on BOTH tables;
--   2. `entitlement_authority_at` added to the writable-column allow-list;
--   3. the ut_members UPDATE writes it when the caller supplies it;
--   4. the profiles   UPDATE writes it when the caller supplies it.
--
-- WHY. Nothing in the stored state said whether a row's entitlement had ever been
-- produced by a COMPLETED, VERIFIED subscription reconciliation. The reader had to
-- infer it from the presence of an identifier, and `api/billing/checkout` writes
-- `stripe_customer_id` at CUSTOMER CREATION with no reconciliation behind it — so a
-- customer id alone could suppress a legitimate legacy paid row and lift a recorded
-- revocation. This column is the explicit evidence that inference was missing.
--
-- SEMANTICS OF THE COLUMN
--   NULL     — no completed reconciliation is on record for this row. Legacy rows,
--              rows written by checkout customer creation, hand-seeded rows.
--   NON-NULL — a lifecycle writer completed a verified reconciliation against
--              Stripe's CURRENT state and persisted this row atomically with that
--              decision. It is the timestamp of that reconciliation.
--
-- CANCELLATION PRESERVES IT. A revocation must keep the authority to revoke, so the
-- deletion/revocation paths simply do NOT name the column: the primitive leaves the
-- stored value alone (the `else r.<column>` branch). It is never cleared.
--
-- REACTIVATION RE-ASSERTS IT. Every completed reconciliation writes a fresh value.
--
-- The column is NOT a guard column: the four snapshot guards (plan,
-- subscription_status, stripe_customer_id, stripe_subscription_id) and the
-- exact-coverage contract are unchanged, so existing payloads keep their shape.
--
-- The whole file is ONE TRANSACTION: the DDL, the function replacement, ownership
-- and the ACLs commit together or not at all.

begin;

-- ---------------------------------------------------------------------------
-- (1) THE AUTHORITY STATE
--
-- `if not exists` so re-applying the candidate is a no-op rather than a failure.
-- ---------------------------------------------------------------------------
alter table public.ut_members add column if not exists entitlement_authority_at timestamptz;
alter table public.profiles   add column if not exists entitlement_authority_at timestamptz;

comment on column public.ut_members.entitlement_authority_at is
  'Batch 14ah: when a completed, verified subscription reconciliation last produced this row. NULL = no reconciliation on record. Never cleared by cancellation.';
comment on column public.profiles.entitlement_authority_at is
  'Batch 14ah: when a completed, verified subscription reconciliation last produced this row. NULL = no reconciliation on record. Never cleared by cancellation.';

-- ---------------------------------------------------------------------------
-- (2) THE PRIMITIVE — unchanged except for the four points listed above.
-- ---------------------------------------------------------------------------

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
    'stripe_subscription_id', 'current_period_end', 'entitlement_authority_at'
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
  v_skipped    integer;
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
    -- (1) RE-LOCATE inside the transaction, holding what is found. This is the
    -- only read that LOCATES rows, and it exists solely to confirm that the
    -- caller's snapshot is still current. It never decides what to write.
    -- (Guard validation in step 4 does perform further reads — one per entry.)
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

    -- ------------------------------------------------------------------
    -- (3) PAYLOAD VALIDATION — deliberately BEFORE the absent short-circuit.
    --
    -- Absence must not be a way to skip the payload contract. If the absent
    -- branch returned first, a caller could put anything at all in `entries`
    -- (a non-array, an entry naming a row this linkage does not own, repeated
    -- or pk-less entries) as long as the linkage happened to be empty — and the
    -- call would be reported as a clean `absent` no-op.
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

    -- An update that LOCATED rows but supplied none is a specific mistake and
    -- gets a specific name. The located-count condition matters: an absent
    -- target with no entries is legitimate and must stay a no-op. A SKIP that
    -- supplied none is a coverage failure below, because every located row would
    -- be missing its guards.
    if v_intent = 'update'
       and coalesce(array_length(v_located, 1), 0) > 0
       and coalesce(array_length(v_entry_pks, 1), 0) = 0 then
      raise exception 'BATCH14 EMPTY_UPDATE: target % located % row(s) but supplied no entries',
        v_name, array_length(v_located, 1)
        using errcode = '22023';
    end if;

    -- An entry must belong to the linkage the caller declared. For an ABSENT
    -- target the located set is empty, so any entry at all lands here.
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

    -- Absence is only a no-op now that the payload has been validated.
    if coalesce(array_length(v_located, 1), 0) = 0 then
      target := v_name; outcome := 'absent'; affected := 0; located_pks := v_located;
      return next;
      continue;
    end if;

    -- ------------------------------------------------------------------
    -- (4) PER-ENTRY RULES — only reachable when a row is actually located, so
    -- every entry here is already known to be in the located set.
    -- ------------------------------------------------------------------
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

      if v_intent = 'skip' or v_entry->'skip' = 'true'::jsonb then
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
    -- (5) GUARD VALIDATION for EVERY entry, update or skip. The rows are held
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
    -- (6) APPLY the subset selected for UPDATE, still conditioned on the
    -- snapshot so a writer that slips past the phase-5 read cannot be lost.
    -- ------------------------------------------------------------------
    v_affected := 0;
    v_skipped := 0;
    for v_entry in select jsonb_array_elements(v_entries) loop
      v_pk   := (v_entry->>'pk')::uuid;
      v_orig := v_entry->'original';
      v_set  := v_entry->'set';
      if v_entry->'skip' = 'true'::jsonb then
        v_skipped := v_skipped + 1;
        continue;
      end if;

      if v_name = 'ut_members' then
        update public.ut_members r set
          plan                   = case when v_set ? 'plan' then v_set->>'plan' else r.plan end,
          subscription_status    = case when v_set ? 'subscription_status' then v_set->>'subscription_status' else r.subscription_status end,
          stripe_customer_id     = case when v_set ? 'stripe_customer_id' then v_set->>'stripe_customer_id' else r.stripe_customer_id end,
          stripe_subscription_id = case when v_set ? 'stripe_subscription_id' then v_set->>'stripe_subscription_id' else r.stripe_subscription_id end,
          current_period_end     = case when v_set ? 'current_period_end' then (v_set->>'current_period_end')::timestamptz else r.current_period_end end,
          -- Batch 14ah: written ONLY when the caller supplies it. Omission — the
          -- cancellation paths — PRESERVES the stored authority.
          entitlement_authority_at = case when v_set ? 'entitlement_authority_at' then (v_set->>'entitlement_authority_at')::timestamptz else r.entitlement_authority_at end
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
          current_period_end     = case when v_set ? 'current_period_end' then (v_set->>'current_period_end')::timestamptz else r.current_period_end end,
          entitlement_authority_at = case when v_set ? 'entitlement_authority_at' then (v_set->>'entitlement_authority_at')::timestamptz else r.entitlement_authority_at end
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
    if v_affected + v_skipped <> coalesce(array_length(v_located, 1), 0) then
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
  'Batch 14u/14v + 14af skip + 14ah authority: applies a caller-decided lifecycle update for ut_members and profiles in ONE transaction. Candidate: not applied to production.';

-- ---------------------------------------------------------------------------
-- Execution is service-role only. PostgreSQL grants EXECUTE to PUBLIC on new
-- functions, so the revoke is load-bearing.
-- ---------------------------------------------------------------------------
revoke all on function public.apply_lifecycle_update(jsonb) from public;
revoke all on function public.apply_lifecycle_update(jsonb) from anon;
revoke all on function public.apply_lifecycle_update(jsonb) from authenticated;
grant execute on function public.apply_lifecycle_update(jsonb) to service_role;

commit;
