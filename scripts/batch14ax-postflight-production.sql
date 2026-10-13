-- ============================================================================
-- batch14ax-postflight-production.sql
--
-- READ-ONLY POSTFLIGHT for the Batch 14 production bundle.
--
-- Every statement is a single SELECT against pg_catalog, pg_policies and
-- AGGREGATE counts. No create, drop, alter, temporary object, DDL or psql
-- meta-command. Each row carries an explicit `expected_met` boolean wherever the
-- expectation is knowable, so a green run does not depend on the operator reading
-- the values correctly.
--
-- PRIVACY: NO member address, user id, customer id or subscription id is
-- returned. Queries over member data return COUNTS ONLY; group keys are never
-- projected. Catalogue text (index/trigger definitions, role names) is schema,
-- not member data.
--
-- Corresponds to scripts/batch14ax-preflight-production.sql: run that first, keep
-- its output, and compare the row counts and exposure numbers against this one.
--
-- Statement inventory:
--   Q0   context
--   Q1   the authority column on both tables             expect_met
--   Q2   the address index, structurally                 expect_met
--   Q3   row counts (compare with the preflight)         informational
--   Q4   function inventory, owner and ACL exposure      expect_met per row
--   Q5   Batch 13 preservation                           expect_met
--   Q6   the exclusive-global statement trigger          expect_met
--   Q7   the direct-writer coverage summary              expect_met
--   Q8   authority / legacy exposure after install       informational (counts)
--   Q9   cross-table conflict exposure after install     informational (counts)
--   Q10  STATE OF THE INSTALL — one boolean              expect_met
-- ============================================================================


-- Q0 ---------------------------------------------------------------------------
select current_setting('server_version') as server_version,
       current_user                       as session_role;


-- Q1 ---------------------------------------------------------------------------
-- expect two rows, both expected_met = true. 20261016 adds the column; a bundle
-- applied only up to 20261015 leaves it absent, and the application would then
-- fail every attested write with 42703.
select t.tablename,
       (select count(*) from pg_attribute a
         where a.attrelid = to_regclass('public.' || t.tablename)
           and a.attname = 'entitlement_authority_at' and a.attnum > 0 and not a.attisdropped) = 1 as expected_met
from (values ('ut_members'), ('profiles')) t(tablename)
order by 1;


-- Q2 ---------------------------------------------------------------------------
-- expect expected_met = true: the index is on public.ut_members, unique, valid,
-- ready, live, keyed on exactly one column, with NO partial predicate, and its
-- expression is lower(btrim(email)). Aggregates always return one row, so a
-- missing index shows as observed counts of 0 with expected_met = false rather
-- than as no output at all.
select (count(*) = 1)                                                                    as index_present,
       (count(*) = 1
        and coalesce(bool_and(t2.relname = 'ut_members'
                              and i.indisunique and i.indisvalid and i.indisready and i.indislive
                              and i.indnkeyatts = 1 and i.indnatts = 1
                              and i.indpred is null
                              and replace(pg_get_expr(i.indexprs, i.indrelid), ' ', '')
                                  in ('lower(btrim(email))', 'lower(btrim((email)::text))')), false)) as expected_met,
       count(*)                                                                          as matching_indexes,
       coalesce(min(t2.relname), '<none>')                                               as index_on_table,
       coalesce(min(i.indisunique::text), '<none>')                                      as is_unique,
       coalesce(min(i.indisvalid::text), '<none>')                                       as is_valid,
       coalesce(min(i.indisready::text), '<none>')                                       as is_ready,
       coalesce(min(i.indislive::text), '<none>')                                        as is_live,
       coalesce(min(i.indnkeyatts::text), '<none>')                                      as key_columns,
       coalesce(min(i.indnatts::text), '<none>')                                         as total_columns,
       coalesce(min((i.indpred is not null)::text), '<none>')                            as is_partial,
       coalesce(min(replace(pg_get_expr(i.indexprs, i.indrelid), ' ', '')), '<none>')    as expression
from pg_index i
join pg_class ic on ic.oid = i.indexrelid
join pg_class t2 on t2.oid = i.indrelid
join pg_namespace n on n.oid = ic.relnamespace
where n.nspname = 'public' and ic.relname = 'ut_members_email_lower_key';


-- Q3 ---------------------------------------------------------------------------
-- informational: these MUST equal the preflight's P1b row counts. The bundle adds
-- no rows and changes no rows in either table.
select 'ut_members' as tablename, count(*) as row_count from public.ut_members
union all
select 'profiles', count(*) from public.profiles
order by 1;


-- Q4 ---------------------------------------------------------------------------
-- expect every row expected_met = true: each function exists, is owned by
-- postgres, and is executable by service_role but NOT by anon or authenticated.
-- The trigger installer must not be callable by either application role.
select p.proname as function_name,
       pg_get_userbyid(p.proowner) as owner,
       (pg_get_userbyid(p.proowner) = 'postgres'
        and has_function_privilege('service_role', p.oid, 'EXECUTE') = (
              p.proname in ('apply_lifecycle_update',
                            'apply_lifecycle_update_sync',
                            'apply_lifecycle_update_sync_global'))
        and not has_function_privilege('anon', p.oid, 'EXECUTE')
        and not has_function_privilege('authenticated', p.oid, 'EXECUTE')) as expected_met
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('apply_lifecycle_update',
                    'apply_lifecycle_update_sync',
                    'apply_lifecycle_update_sync_global',
                    'b14ac_install_trigger')
order by 1;


-- Q5 ---------------------------------------------------------------------------
-- Batch 13 preservation: expect zero privileges for anon/authenticated on both
-- tables, zero grants to PUBLIC, and service_role holding its full set.
select 'anon_or_authenticated_table_privileges' as check_name,
       count(*) as observed, 0 as expect,
       count(*) = 0 as expected_met
from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('ut_members', 'profiles')
  and grantee in ('anon', 'authenticated')
union all
select 'public_grants',
       count(*), 0, count(*) = 0
from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('ut_members', 'profiles') and grantee = 'PUBLIC'
union all
select 'service_role_table_privileges',
       count(*),
       case when current_setting('server_version_num')::int >= 170000 then 16 else 14 end,
       count(*) = case when current_setting('server_version_num')::int >= 170000 then 16 else 14 end
from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('ut_members', 'profiles') and grantee = 'service_role'
union all
select 'policies_on_the_two_tables',
       count(*), null::bigint, null::boolean
from pg_policies where schemaname = 'public' and tablename in ('ut_members', 'profiles')
order by 1;


-- Q6 ---------------------------------------------------------------------------
-- expect exactly 2 rows — one per table — each calling b14ac_trg_stmt_exclusive.
-- The SHARED variant must NOT appear: two writers can upgrade shared to exclusive
-- and deadlock, which is why the release installs the exclusive protocol.
select count(*) = 2 as expected_met,
       count(*) as trigger_rows,
       count(distinct c.relname) as tables_covered,
       count(*) filter (where p.proname = 'b14ac_trg_stmt_exclusive') as exclusive_rows,
       count(*) filter (where p.proname = 'b14ac_trg_stmt_shared')    as shared_rows,
       string_agg(distinct c.relname || ':' || coalesce(p.proname, '<none>'), ', ' order by c.relname || ':' || coalesce(p.proname, '<none>')) as coverage
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
left join pg_proc p on p.oid = t.tgfoid
where n.nspname = 'public' and c.relname in ('ut_members', 'profiles')
  and not t.tgisinternal and t.tgname = 'b14ac_stmt_trg';


-- Q7 ---------------------------------------------------------------------------
-- the direct-writer summary: the application's entry point is the GLOBAL variant
-- (the per-identity one does not compose with the trigger), and it is present.
select (to_regprocedure('public.apply_lifecycle_update_sync_global(jsonb)') is not null) as global_entry_point_present,
       (to_regprocedure('public.apply_lifecycle_update(jsonb)') is not null)             as reviewed_primitive_present,
       coalesce(has_function_privilege('service_role',
                 to_regprocedure('public.apply_lifecycle_update_sync_global(jsonb)'), 'EXECUTE'), false) as service_role_can_call_entry_point;


-- Q8 ---------------------------------------------------------------------------
-- AUTHORITY AND LEGACY EXPOSURE AFTER THE INSTALL — COUNTS ONLY.
-- Compare against the preflight's P7: `attested_rows` must be UNCHANGED in both
-- tables (this bundle performs no backfill; stamping legacy rows would manufacture
-- authority the system never established) and `row_count` must be unchanged.
select 'ut_members' as tablename, count(*) as rows,
       count(*) filter (where to_jsonb(m) ->> 'entitlement_authority_at' is not null) as attested_rows,
       count(*) filter (where to_jsonb(m) ->> 'entitlement_authority_at' is null)     as unattested_legacy_rows,
       count(*) filter (where to_jsonb(m) ->> 'entitlement_authority_at' is null
                          and m.stripe_customer_id is not null
                          and m.stripe_subscription_id is null)                       as checkout_style_customer_only_rows,
       count(*) filter (where m.stripe_customer_id is null and m.stripe_subscription_id is null) as rows_with_no_stripe_linkage,
       count(*) filter (where lower(coalesce(m.subscription_status, '')) in ('canceled','incomplete_expired','unpaid')) as revoked_rows,
       count(*) filter (where lower(coalesce(m.subscription_status, '')) = 'past_due')  as past_due_rows
from public.ut_members m
union all
select 'profiles', count(*),
       count(*) filter (where to_jsonb(p) ->> 'entitlement_authority_at' is not null),
       count(*) filter (where to_jsonb(p) ->> 'entitlement_authority_at' is null),
       count(*) filter (where to_jsonb(p) ->> 'entitlement_authority_at' is null
                          and p.stripe_customer_id is not null
                          and p.stripe_subscription_id is null),
       count(*) filter (where p.stripe_customer_id is null and p.stripe_subscription_id is null),
       count(*) filter (where lower(coalesce(p.subscription_status, '')) in ('canceled','incomplete_expired','unpaid')),
       count(*) filter (where lower(coalesce(p.subscription_status, '')) = 'past_due')
from public.profiles p
order by 1;


-- Q9 ---------------------------------------------------------------------------
-- CROSS-TABLE CONFLICT EXPOSURE AFTER THE INSTALL — COUNTS ONLY. The address is a
-- group key only and is never projected. These numbers must equal the preflight's
-- P8 at install time: the bundle resolves nothing about existing data, and it must
-- not silently hide a contradiction either.
with m as (
  select lower(btrim(email)) as addr,
         to_jsonb(m) ->> 'entitlement_authority_at' as attested_at,
         m.stripe_customer_id as cus, m.stripe_subscription_id as sub, m.plan as plan
  from public.ut_members m
  where email is not null and btrim(email) <> ''
), p as (
  select lower(btrim(email)) as addr,
         to_jsonb(p) ->> 'entitlement_authority_at' as attested_at,
         p.stripe_customer_id as cus, p.stripe_subscription_id as sub, p.plan as plan
  from public.profiles p
  where email is not null and btrim(email) <> ''
)
select
  (select count(*) from m join p using (addr))                                       as addresses_in_both_tables,
  (select count(*) from m join p using (addr)
    where m.attested_at is not null and p.attested_at is not null
      and m.cus is not null and p.cus is not null and m.cus <> p.cus)                as attested_customer_contradictions,
  (select count(*) from m join p using (addr)
    where m.attested_at is not null and p.attested_at is not null
      and m.sub is not null and p.sub is not null and m.sub <> p.sub)                as attested_subscription_contradictions,
  (select count(*) from m join p using (addr)
    where m.attested_at is not null and p.attested_at is null
      and coalesce(p.plan, '') = 'initiate')                                         as attested_member_suppresses_unattested_paid_mirror,
  (select count(*) from m join p using (addr)
    where p.attested_at is not null and m.attested_at is null
      and coalesce(m.plan, '') = 'initiate')                                         as attested_mirror_suppresses_unattested_paid_member;


-- Q10 --------------------------------------------------------------------------
-- STATE OF THE INSTALL — expect expected_met = true. This single row ANDs the
-- critical postflight conditions so a green run is unambiguous:
--   * the authority column exists on BOTH tables
--   * the address index is structurally the required single-expression key
--   * the reviewed primitive, both wrappers and the trigger installer exist
--   * the EXCLUSIVE statement trigger covers BOTH tables
--   * anon and authenticated hold no table privileges (Batch 13 preserved)
select
  (select count(*) from pg_attribute a
    where a.attrelid = to_regclass('public.ut_members')
      and a.attname = 'entitlement_authority_at' and a.attnum > 0) = 1
  and
  (select count(*) from pg_attribute a
    where a.attrelid = to_regclass('public.profiles')
      and a.attname = 'entitlement_authority_at' and a.attnum > 0) = 1
  and
  (select count(*) = 1 from pg_index i
     join pg_class ic on ic.oid = i.indexrelid
     join pg_class t2 on t2.oid = i.indrelid
     join pg_namespace n on n.oid = ic.relnamespace
    where n.nspname = 'public' and ic.relname = 'ut_members_email_lower_key'
      and t2.relname = 'ut_members' and i.indisunique and i.indisvalid and i.indisready and i.indislive
      and i.indnkeyatts = 1 and i.indnatts = 1 and i.indpred is null
      and replace(pg_get_expr(i.indexprs, i.indrelid), ' ', '') in ('lower(btrim(email))', 'lower(btrim((email)::text))'))
  and
  (select count(*) = 4 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('apply_lifecycle_update',
                                                 'apply_lifecycle_update_sync',
                                                 'apply_lifecycle_update_sync_global',
                                                 'b14ac_install_trigger'))
  and
  (select count(*) = 2 from pg_trigger t
     join pg_class c on c.oid = t.tgrelid
     join pg_namespace n on n.oid = c.relnamespace
     join pg_proc p on p.oid = t.tgfoid
    where n.nspname = 'public' and c.relname in ('ut_members', 'profiles')
      and not t.tgisinternal and t.tgname = 'b14ac_stmt_trg'
      and p.proname = 'b14ac_trg_stmt_exclusive')
  and
  (select count(*) = 0 from information_schema.role_table_grants
    where table_schema = 'public' and table_name in ('ut_members', 'profiles')
      and grantee in ('anon', 'authenticated'))
  as expected_met;
