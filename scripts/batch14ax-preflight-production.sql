-- ============================================================================
-- batch14ax-preflight-production.sql
--
-- READ-ONLY PREFLIGHT for the Batch 14 production bundle.
--
-- Every statement here is a single SELECT against pg_catalog, pg_policies, the
-- has_*_privilege() functions and AGGREGATE counts over the two membership
-- tables. There is NO create, drop, alter, temporary object, DDL or psql
-- meta-command, so the file is executable through any SQL interface, including
-- the Supabase management query endpoint.
--
-- PRIVACY: NO member address, user id, customer id or subscription id is ever
-- returned. Every query over member data returns COUNTS ONLY — group keys are
-- used in subqueries and never projected. The one catalogue listing (trigger
-- definitions) contains schema text, not member data.
--
-- Run each statement individually and check its own result; a success marker is
-- not a substitute for every statement executing. Expectations are stated above
-- each statement.
--
-- Version-aware: MAINTAIN exists only from PostgreSQL 17, so privilege lists are
-- built with array_append inside a CASE — never with `text[] || 'MAINTAIN'`,
-- which is parsed as anyarray || anyarray and raises "malformed array literal".
--
-- Statement inventory:
--   P0   server / role / ownership context            informational
--   P1   the two tables exist, columns, row counts    informational
--   P2   the address index, structurally              informational
--   P3   the conditions that make 20261010 ABORT      expect all zero
--   P4   lifecycle functions, owner, ACL exposure     informational
--   P5   triggers on the two tables                   informational
--   P6   Batch 13 preservation baseline               anon/authenticated = 0
--   P7   authority / legacy exposure per table        informational (counts)
--   P8   cross-table conflict exposure                informational (counts)
--   P9   the direct-writer coverage check             informational
--   P10  installation prerequisites                   informational
-- ============================================================================


-- P0 ---------------------------------------------------------------------------
-- informational. `session_role` must be able to SET OWNERSHIP on the functions
-- (20261014 does `alter function ... owner to postgres`) and to call
-- b14ac_install_trigger: in practice run the bundle as `postgres`.
select current_setting('server_version')     as server_version,
       current_setting('server_version_num') as server_version_num,
       current_user                          as session_role,
       (select rolsuper from pg_roles where rolname = current_user) as session_is_superuser;


-- P1 ---------------------------------------------------------------------------
-- informational: one row per table; `exists` must be true for both, and
-- `has_authority_column` is false BEFORE the bundle (20261016 adds it).
select t.tablename,
       to_regclass('public.' || t.tablename) is not null as exists,
       (select count(*) from pg_attribute a
         where a.attrelid = to_regclass('public.' || t.tablename)
           and a.attnum > 0 and not a.attisdropped)      as column_count,
       (select count(*) from pg_attribute a
         where a.attrelid = to_regclass('public.' || t.tablename)
           and a.attname = 'entitlement_authority_at' and a.attnum > 0) as has_authority_column
from (values ('ut_members'), ('profiles')) t(tablename)
order by 1;


-- P1b --------------------------------------------------------------------------
-- informational: the row counts the bundle must leave UNCHANGED.
select 'ut_members' as tablename, count(*) as row_count from public.ut_members
union all
select 'profiles', count(*) from public.profiles
order by 1;


-- P2 ---------------------------------------------------------------------------
-- informational: the address index as it stands. `matching_indexes` may be 0
-- (not installed), 1 (installed) or >1 (needs investigation). When present, every
-- flag is reported so a wrong-shaped object is visible before the migration runs.
select count(*)                                                as matching_indexes,
       coalesce(min(t2.relname), '<none>')                     as index_on_table,
       coalesce(min(i.indisunique::text), '<none>')            as is_unique,
       coalesce(min(i.indisvalid::text), '<none>')             as is_valid,
       coalesce(min(i.indisready::text), '<none>')             as is_ready,
       coalesce(min(i.indislive::text), '<none>')              as is_live,
       coalesce(min(i.indnkeyatts::text), '<none>')            as key_columns,
       coalesce(min(i.indnatts::text), '<none>')               as total_columns,
       coalesce(min((i.indpred is not null)::text), '<none>')  as is_partial,
       coalesce(min(replace(pg_get_expr(i.indexprs, i.indrelid), ' ', '')), '<none>') as expression
from pg_index i
join pg_class ic  on ic.oid = i.indexrelid
join pg_class t2  on t2.oid = i.indrelid
join pg_namespace n on n.oid = ic.relnamespace
where n.nspname = 'public' and ic.relname = 'ut_members_email_lower_key';


-- P3 ---------------------------------------------------------------------------
-- expect every count 0. These are exactly the conditions 20261010 aborts on.
select (select count(*) from public.ut_members where email is null)                             as null_emails,
       (select count(*) from public.ut_members where email is not null and btrim(email) = '')    as empty_emails,
       (select count(*) from public.ut_members
         where email is not null and email <> lower(btrim(email)))                              as non_canonical_addresses,
       (select count(*) from (select 1 from public.ut_members
         where email is not null and btrim(email) <> ''
         group by lower(btrim(email)) having count(*) > 1) d)                                   as case_duplicate_groups,
       (select coalesce(sum(c), 0) from (select count(*) as c from public.ut_members
         where email is not null and btrim(email) <> ''
         group by lower(btrim(email)) having count(*) > 1) s)                                   as case_duplicate_rows;


-- P4 ---------------------------------------------------------------------------
-- informational: which lifecycle functions exist, who owns them, and whether the
-- three application roles can execute each one. `anon_can_execute` and
-- `authenticated_can_execute` must be false for every row.
select p.proname                                        as function_name,
       pg_get_userbyid(p.proowner)                      as owner,
       coalesce(array_length(p.proacl, 1), 0)           as acl_entries,
       has_function_privilege('service_role', p.oid, 'EXECUTE')     as service_role_can_execute,
       has_function_privilege('anon', p.oid, 'EXECUTE')             as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE')    as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('apply_lifecycle_update',
                    'apply_lifecycle_update_sync',
                    'apply_lifecycle_update_sync_global',
                    'b14ac_install_trigger',
                    'b14ab_lifecycle_apply',
                    'b14ab_acquire_global_lock')
order by 1;


-- P5 ---------------------------------------------------------------------------
-- informational: non-internal triggers on the two tables, with the function each
-- one calls. Before the bundle this is expected to be empty; after it, P9 must
-- show the exclusive statement trigger on BOTH tables.
select c.relname as table_name, t.tgname as trigger_name, p.proname as calls_function,
       pg_get_triggerdef(t.oid) as definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
left join pg_proc p on p.oid = t.tgfoid
where n.nspname = 'public' and c.relname in ('ut_members', 'profiles') and not t.tgisinternal
order by 1, 2;


-- P6 ---------------------------------------------------------------------------
-- Batch 13 preservation baseline. Expect anon = 0 and authenticated = 0 on BOTH
-- tables; service_role keeps its full set (8 privileges on PostgreSQL 17,
-- 7 on 16, where MAINTAIN does not exist).
with roles(r) as (values ('anon'), ('authenticated'), ('service_role')),
     privs(priv) as (
       select unnest(
         case when current_setting('server_version_num')::int >= 170000
              then array_append(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'], 'MAINTAIN')
             else array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']
         end
       )
     )
select r.r as role_name, t.tablename,
       count(*) filter (where has_table_privilege(r.r, 'public.' || t.tablename, p.priv)) as privileges_held
from roles r
cross join (values ('ut_members'), ('profiles')) t(tablename)
cross join privs p
group by 1, 2
order by 1, 2;


-- P6b --------------------------------------------------------------------------
-- Batch 13 preservation baseline: any policy on the two tables, and any grant to
-- PUBLIC. `expect` is stated per row; a healthy database has no PUBLIC grant.
select 'public_table_grants' as item, count(*) as observed, 0 as expect
from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('ut_members', 'profiles') and grantee = 'PUBLIC'
union all
select 'policy_count', count(*), null::bigint
from pg_policies where schemaname = 'public' and tablename in ('ut_members', 'profiles')
order by 1;


-- P7 ---------------------------------------------------------------------------
-- AUTHORITY AND LEGACY EXPOSURE — COUNTS ONLY.
--
-- `to_jsonb(row)` is used for the authority column so this file runs BEFORE the
-- column exists (20261016 adds it) as well as after. Definitions mirror
-- src/lib/membership-plan.ts: revoking statuses are canceled /
-- incomplete_expired / unpaid, and a plan outside guest|free|initiate is
-- normalised to 'guest' by the reader.
select 'ut_members' as tablename, count(*) as rows,
       count(*) filter (where to_jsonb(m) ->> 'entitlement_authority_at' is not null) as attested_rows,
       count(*) filter (where to_jsonb(m) ->> 'entitlement_authority_at' is null)     as unattested_legacy_rows,
       count(*) filter (where to_jsonb(m) ->> 'entitlement_authority_at' is null
                          and m.stripe_customer_id is not null
                          and m.stripe_subscription_id is null)                       as checkout_style_customer_only_rows,
       count(*) filter (where m.stripe_customer_id is null and m.stripe_subscription_id is null) as rows_with_no_stripe_linkage,
       count(*) filter (where lower(coalesce(m.subscription_status, '')) in ('canceled','incomplete_expired','unpaid')) as revoked_rows,
       count(*) filter (where lower(coalesce(m.subscription_status, '')) = 'past_due')  as past_due_rows,
       count(*) filter (where m.plan is null or m.plan not in ('guest','free','initiate')) as unrecognised_plan_rows
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
       count(*) filter (where lower(coalesce(p.subscription_status, '')) = 'past_due'),
       count(*) filter (where p.plan is null or p.plan not in ('guest','free','initiate'))
from public.profiles p
order by 1;


-- P8 ---------------------------------------------------------------------------
-- CROSS-TABLE CONFLICT EXPOSURE — COUNTS ONLY, no address is ever projected.
--
-- `addr` appears only in the group keys of the CTEs. The counts answer: how many
-- addresses are in both tables, how many would FAIL CLOSED under the Batch 14ah
-- reader (two attested rows disagreeing about the customer or the subscription),
-- and how many are in the "one table is attested, the other holds an unattested
-- paid row" population the authority rule now decides.
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


-- P9 ---------------------------------------------------------------------------
-- DIRECT-WRITER COVERAGE. Expect BEFORE the bundle: no rows. AFTER the bundle:
-- exactly 2 rows (one per table) calling b14ac_trg_stmt_exclusive, which is the
-- protocol that matches apply_lifecycle_update_sync_global. A row calling
-- b14ac_trg_stmt_shared, or coverage on only ONE table, is a FAILED install: the
-- shared trigger deadlocks on lock upgrade and a wrapper alone leaves direct
-- writers unsynchronized.
select count(*) as b14_trigger_rows,
       count(*) filter (where p.proname = 'b14ac_trg_stmt_exclusive') as exclusive_rows,
       count(*) filter (where p.proname = 'b14ac_trg_stmt_shared')    as shared_rows,
       count(distinct c.relname)                                      as tables_covered
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
left join pg_proc p on p.oid = t.tgfoid
where n.nspname = 'public' and c.relname in ('ut_members', 'profiles')
  and not t.tgisinternal and t.tgname like 'b14%';


-- P10 --------------------------------------------------------------------------
-- INSTALLATION PREREQUISITES. `service_role` must be able to EXECUTE the
-- application's entry point, and the application's entry point must be the
-- GLOBAL variant — the per-identity one does not compose with the trigger.
select (to_regprocedure('public.apply_lifecycle_update_sync_global(jsonb)') is not null) as global_entry_point_present,
       (to_regprocedure('public.apply_lifecycle_update_sync(jsonb)') is not null)        as per_identity_entry_point_present,
       (to_regprocedure('public.apply_lifecycle_update(jsonb)') is not null)             as reviewed_primitive_present,
       (to_regprocedure('public.b14ac_install_trigger(text)') is not null)               as trigger_installer_present,
       coalesce(has_function_privilege('service_role',
                 to_regprocedure('public.apply_lifecycle_update_sync_global(jsonb)'), 'EXECUTE'), false) as service_role_can_call_entry_point;
