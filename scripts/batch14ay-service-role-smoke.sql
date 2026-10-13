-- ---------------------------------------------------------------------------
-- batch14ay-service-role-smoke.sql
--
-- ROLLBACK-ONLY synthetic smoke for the released SQL surface. Run it AFTER the bundle and
-- the boundary are installed, as a superuser operator:
--
--     psql -v ON_ERROR_STOP=1 -f scripts/batch14ay-service-role-smoke.sql
--
-- WHAT IT PROVES, as the role the application writes with (`service_role`, not as the
-- superuser session that runs it):
--   1. a direct INSERT commits;
--   2. a direct UPDATE commits and FIRES the exclusive-global statement trigger — which
--      exercises the INVOKER helper path, the one permission the boundary has to grant
--      explicitly;
--   3. the atomic RPC `apply_lifecycle_update_sync_global` returns `updated` with one
--      affected row and leaves the row reading as intended.
--
-- WHY IT IS SAFE: the whole thing runs inside ONE transaction that ends in `rollback`, so
-- no membership row and no authority stamp is persisted. The identifiers are synthetic and
-- deliberately invalid as data (`...@invalid.test`, a fixed zero-ish UUID). There are NO
-- Stripe calls, no network access and no provider reconciliation of any kind: this exercises
-- PostgreSQL privileges and the trigger, nothing else.
--
-- A FAILED ASSERTION ABORTS THE TRANSACTION. The assertions `raise exception`, so a red run
-- exits non-zero and, because the transaction is aborted, the session discards it: the
-- rollback-only property does not depend on reaching the `rollback` statement. The two
-- post-condition rows at the end then assert, from OUTSIDE the transaction and as the
-- operator, that nothing persisted — the claim is measured, not promised.
-- ---------------------------------------------------------------------------

\set ON_ERROR_STOP on

begin;

-- The writing role, for this transaction only. Everything below is subject to exactly the
-- privileges and policies production applies to it.
set local role service_role;

do $smoke$
declare
  c_id      constant uuid := 'b14a0000-0000-4000-8000-000000000001';
  v_outcome text;
  v_affected integer;
  v_located uuid[];
  v_plan    text;
  v_status  text;
begin
  -- (1) direct INSERT
  insert into public.ut_members (id, email, plan, subscription_status,
                                 stripe_customer_id, stripe_subscription_id)
  values (c_id, 'b14ay-smoke@invalid.test', 'guest', 'inactive',
          'cus_b14ay_smoke', 'sub_b14ay_smoke');

  -- (2) direct UPDATE — a statement-level BEFORE trigger fires on this
  update public.ut_members set current_period_end = now() where id = c_id;
  if not found then
    raise exception 'SMOKE FAILED: the direct UPDATE matched no row';
  end if;

  -- (3) the atomic RPC, with a payload in the reviewed primitive's schema
  select outcome, affected, located_pks
    into v_outcome, v_affected, v_located
    from public.apply_lifecycle_update_sync_global(
      jsonb_build_array(
        jsonb_build_object(
          'target', 'ut_members',
          'linkage', jsonb_build_object(
                       'customer_id', 'cus_b14ay_smoke',
                       'subscription_ids', jsonb_build_array('sub_b14ay_smoke')),
          'intent', 'update',
          'seen_pks', jsonb_build_array(c_id::text),
          'entries', jsonb_build_array(
            jsonb_build_object(
              'pk', c_id::text,
              'original', jsonb_build_object(
                            'plan', 'guest',
                            'subscription_status', 'inactive',
                            'stripe_customer_id', 'cus_b14ay_smoke',
                            'stripe_subscription_id', 'sub_b14ay_smoke'),
              'set', jsonb_build_object(
                       'plan', 'initiate',
                       'subscription_status', 'active',
                       'stripe_customer_id', 'cus_b14ay_smoke',
                       'stripe_subscription_id', 'sub_b14ay_smoke',
                       'entitlement_authority_at',
                       to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
            ))
        )));

  if v_outcome is distinct from 'updated' or v_affected is distinct from 1 then
    raise exception 'SMOKE FAILED: the atomic RPC returned outcome=% affected=% (located=%)',
      coalesce(v_outcome, '<null>'), coalesce(v_affected::text, '<null>'),
      coalesce(v_located::text, '<null>');
  end if;

  select plan, subscription_status into v_plan, v_status
    from public.ut_members where id = c_id;
  if v_plan is distinct from 'initiate' or v_status is distinct from 'active' then
    raise exception 'SMOKE FAILED: the row reads plan=% status=% after the RPC',
      coalesce(v_plan, '<null>'), coalesce(v_status, '<null>');
  end if;

  raise notice 'SMOKE OK: direct INSERT, direct UPDATE (statement trigger fired) and the atomic RPC all succeeded as service_role';
end
$smoke$;

-- Nothing above survives this statement.
rollback;

-- ---------------------------------------------------------------------------
-- Post-conditions, evaluated OUTSIDE the transaction, as the operator: the synthetic row
-- must not exist in either table. `expected_met` must be true on both rows.
-- ---------------------------------------------------------------------------
select 'nothing_persisted_in_ut_members' as check_name, count(*) = 0 as expected_met
  from public.ut_members where id = 'b14a0000-0000-4000-8000-000000000001'
union all
select 'nothing_persisted_in_profiles', count(*) = 0
  from public.profiles where user_id = 'b14a0000-0000-4000-8000-000000000001'
order by 1;
