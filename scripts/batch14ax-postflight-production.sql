-- ============================================================================
-- batch14ax-postflight-production.sql
--
-- READ-ONLY POSTFLIGHT for the Batch 14 production bundle.
--
-- Every statement is a single SELECT against pg_catalog, pg_policies and
-- AGGREGATE counts. No create, drop, alter, temporary object, DDL or psql
-- meta-command — batch14ax-install-bundle-validate.sh greps this file for any
-- writing statement outside a comment and requires zero hits.
--
-- PRIVACY: NO member address, user id, customer id or subscription id is
-- returned. Queries over member data return COUNTS ONLY; group keys are never
-- projected. Catalogue text (index/trigger definitions, role names) is schema,
-- not member data.
--
-- ---------------------------------------------------------------------------
-- THE MANDATORY VERDICT
--
-- Q90 is the LAST statement in this file and IS the verdict: a single boolean.
-- The validator reads the last line of this file's output and REQUIRES it to be
-- exactly `t`. A FALSE, NULL or MISSING verdict is a failure — the gate does not
-- pass by default, and a malformed file cannot be mistaken for a green one.
--
-- The verdict is not a summary of the rows above it: it independently ANDs every
-- condition the release depends on —
--   * the authority column, BY TYPE, on both tables
--   * the address index, by table / key count / predicate / flags / expression
--   * EXACT function signatures, security mode, search_path, owner and ACLs
--   * BEFORE STATEMENT triggers that are ENABLED and cover INSERT AND UPDATE on
--     BOTH tables, calling the exclusive-global function
--   * Batch 13 preservation by EFFECTIVE access: table AND column, for anon,
--     authenticated and PUBLIC, evaluated with has_*_privilege (which is
--     inheritance-aware, unlike reading ACL rows)
--   * RLS enabled on both tables, the withdrawn read policy absent, and no policy
--     visible to anon/authenticated/PUBLIC
-- ---------------------------------------------------------------------------
--
-- Statement inventory:
--   Q0   context                                        informational
--   Q1   authority column: presence and TYPE            expected_met
--   Q2   the address index, structurally                expected_met
--   Q3   row counts (compare with the preflight)        informational
--   Q4   signature + mode + search_path + owner + ACLs  expected_met per row
--   Q5   the raw ACL of each function                   informational
--   Q6   the statement triggers, in full                expected_met per row
--   Q7   Batch 13: effective TABLE access               expected_met per row
--   Q8   Batch 13: effective COLUMN access              expected_met
--   Q9   Batch 13: PUBLIC ACLs, table + column + fn     expected_met
--   Q10  Batch 13: RLS and the policy set               expected_met
--   Q10b the exact policy inventory                     informational
--   Q20  table ownership and RLS flags                  informational
--   Q80  authority / legacy exposure after install      informational (counts)
--   Q81  cross-table conflict exposure after install    informational (counts)
--   Q90  *** THE VERDICT ***                            MUST read `t`
-- ============================================================================


-- Q0 ---------------------------------------------------------------------------
select current_setting('server_version')     as server_version,
       current_setting('server_version_num') as server_version_num,
       current_user                          as session_role;


-- Q1 ---------------------------------------------------------------------------
-- expect two rows, both expected_met = true. The TYPE matters: 20261016 declares
-- `timestamptz`, and a column of another type would not carry the reconciliation
-- timestamp the reader compares and reports.
select t.tablename,
       (select count(*) from pg_attribute a
         where a.attrelid = to_regclass('public.' || t.tablename)
           and a.attname = 'entitlement_authority_at'
           and a.attnum > 0 and not a.attisdropped
           and format_type(a.atttypid, a.atttypmod) = 'timestamp with time zone') = 1 as expected_met,
       coalesce((select format_type(a.atttypid, a.atttypmod) from pg_attribute a
                  where a.attrelid = to_regclass('public.' || t.tablename)
                    and a.attname = 'entitlement_authority_at' and a.attnum > 0), '<absent>') as column_type
from (values ('ut_members'), ('profiles')) t(tablename)
order by 1;


-- Q2 ---------------------------------------------------------------------------
-- expect expected_met = true: on public.ut_members, unique, valid, ready, live,
-- exactly one key column, no INCLUDE columns, NO partial predicate, and the
-- expression is lower(btrim(email)). Aggregates always return one row, so a
-- missing index shows as observed zeros with expected_met = false rather than as
-- no output at all.
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
-- informational: MUST equal the preflight's P1b row counts. The bundle adds no
-- rows and changes no rows in either table.
select 'ut_members' as tablename, count(*) as row_count from public.ut_members
union all
select 'profiles', count(*) from public.profiles
order by 1;


-- Q4 ---------------------------------------------------------------------------
-- THE COMPLETE RETAINED FUNCTION SURFACE, one row per function.
-- expect every row expected_met = true:
--   * the signature is EXACT (the identity arguments, so an overload cannot pass)
--   * the owner is postgres
--   * search_path is pinned to `pg_catalog, public` on EVERY bundle-owned function,
--     not only the callable entries — an unpinned helper resolves names through a
--     session-controlled path
--   * the security mode is the declared one (the primitive DEFINER; everything
--     else INVOKER)
--   * service_role may EXECUTE EXACTLY the release closure — the global entry
--     point, the reviewed primitive it calls, and the two advisory-lock helpers on
--     the wrapper's and the trigger's INVOKER path — and NOT the withdrawn
--     per-identity variant nor the operator-only installer
--   * anon and authenticated may execute NONE of them, and PUBLIC holds no EXECUTE
--     grant on any of them
-- A function that is MISSING still produces a row (LEFT JOIN), with expected_met
-- NULL rather than absent: an absent row must never read as "nothing to check".
select e.proname                                                                 as function_name,
       coalesce(pg_get_function_identity_arguments(p.oid), '<MISSING>')           as signature,
       coalesce(pg_get_userbyid(p.proowner), '<MISSING>')                         as owner,
       case when p.oid is null then '<MISSING>'
            when p.prosecdef then 'DEFINER' else 'INVOKER' end                    as security_mode,
       coalesce(replace(array_to_string(p.proconfig, ','), ' ', ''), '<unset>')   as search_path,
       (p.oid is not null
        and pg_get_function_identity_arguments(p.oid) = e.signature
        and pg_get_userbyid(p.proowner) = 'postgres'
        and replace(array_to_string(p.proconfig, ','), ' ', '') = 'search_path=pg_catalog,public'
        and p.prosecdef = e.is_definer
        and has_function_privilege('service_role', p.oid, 'EXECUTE') = e.svc
        and not has_function_privilege('anon', p.oid, 'EXECUTE')
        and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
        and not (p.proacl is null
                 or exists (select 1 from aclexplode(p.proacl) x
                             where x.grantee = 0 and x.privilege_type = 'EXECUTE'))) as expected_met
from (values
        ('apply_lifecycle_update',             'p_targets jsonb',           true,  true),
        ('apply_lifecycle_update_sync',        'p_targets jsonb',           false, false),
        ('apply_lifecycle_update_sync_global', 'p_targets jsonb',           false, true),
        ('b14ab_acquire_global_lock',          'p_shared boolean',          false, true),
        ('b14ab_linkage_global_key',           '',                          false, true),
        ('b14ab_linkage_key',                  'p_kind text, p_value text', false, false),
        ('b14ac_install_trigger',              'p_mode text',               false, false),
        ('b14ac_linkage_keys_for_payload',     'p_targets jsonb',           false, false),
        ('b14ac_trg_stmt_exclusive',           '',                          false, false),
        ('b14ac_trg_stmt_shared',              '',                          false, false)
     ) as e(proname, signature, is_definer, svc)
left join (select q.* from pg_proc q
             join pg_namespace qn on qn.oid = q.pronamespace
            where qn.nspname = 'public') p on p.proname = e.proname
order by 1;


-- Q4b --------------------------------------------------------------------------
-- The Batch 14ab PROTOTYPE entry points are EXCLUDED from the installed surface.
-- expect every row expected_met = true. RESTRICT is what makes the exclusion
-- fail-closed: if something still depends on one, the boundary migration ABORTS
-- rather than dropping it out from under its dependent.
select 'b14ab_install_trigger'        as prototype, to_regprocedure('public.b14ab_install_trigger(text)') is null as expected_met
union all select 'b14ab_trg_row',               to_regprocedure('public.b14ab_trg_row()') is null
union all select 'b14ab_trg_stmt',              to_regprocedure('public.b14ab_trg_stmt()') is null
union all select 'b14ab_lifecycle_apply',       to_regprocedure('public.b14ab_lifecycle_apply(text,text,text,text,bigint[],text,text)') is null
union all select 'b14ab_lifecycle_apply_nosync',to_regprocedure('public.b14ab_lifecycle_apply_nosync(text,text,text,text,bigint[],text,text)') is null
union all select 'b14ab_acquire_linkage_locks', to_regprocedure('public.b14ab_acquire_linkage_locks(text,text,text,text)') is null
union all select 'b14ab_linkage_keys',          to_regprocedure('public.b14ab_linkage_keys(text,text,text,text)') is null
order by 1;


-- Q5 ---------------------------------------------------------------------------
-- informational: the raw ACL of each function, so a reviewer can see exactly who
-- holds EXECUTE rather than only whether a role can reach it.
select p.proname as function_name,
       coalesce(p.proacl::text, '<default: PUBLIC EXECUTE>') as acl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('apply_lifecycle_update',
                    'apply_lifecycle_update_sync',
                    'apply_lifecycle_update_sync_global',
                    'b14ac_install_trigger')
order by 1;


-- Q6 ---------------------------------------------------------------------------
-- THE STATEMENT TRIGGERS, IN FULL. expect two rows, one per table, both
-- expected_met = true. A trigger is only evidence when it is ENABLED and covers
-- the events the writers actually perform:
--   tgenabled = 'O'      fires in origin sessions (not disabled, not replica-only)
--   (tgtype & 1) = 0     STATEMENT level — a row trigger would take the key after
--                        the statement began, and would miss rows it does not visit
--   (tgtype & 2) = 2     BEFORE — the key must be taken before the write
--   (tgtype & 4) = 4     INSERT covered
--   (tgtype & 16) = 16   UPDATE covered
select c.relname                                                            as table_name,
       t.tgname                                                             as trigger_name,
       p.proname                                                            as calls_function,
       t.tgenabled                                                          as enabled,
       ((t.tgtype & 1) = 0)                                                 as is_statement_level,
       ((t.tgtype & 2) = 2)                                                 as is_before,
       ((t.tgtype & 4) = 4)                                                 as covers_insert,
       ((t.tgtype & 16) = 16)                                               as covers_update,
       (t.tgenabled = 'O'
        and (t.tgtype & 1) = 0 and (t.tgtype & 2) = 2
        and (t.tgtype & 4) = 4 and (t.tgtype & 16) = 16
        and p.proname = 'b14ac_trg_stmt_exclusive')                         as expected_met,
       pg_get_triggerdef(t.oid)                                             as definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
where n.nspname = 'public' and c.relname in ('ut_members', 'profiles')
  and not t.tgisinternal and t.tgname = 'b14ac_stmt_trg'
order by 1;


-- Q7 ---------------------------------------------------------------------------
-- Batch 13 preservation — EFFECTIVE TABLE ACCESS. has_table_privilege() accounts
-- for grants through PUBLIC and through role membership, so this is stronger than
-- reading ACL rows. expect expected_met = true on every row: zero privileges for
-- anon and authenticated on both tables; service_role keeps its full set.
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
       count(*) filter (where has_table_privilege(r.r, 'public.' || t.tablename, priv)) as privileges_held,
       case when r.r = 'service_role'
            then count(*) filter (where has_table_privilege(r.r, 'public.' || t.tablename, priv)) >= 7
            else count(*) filter (where has_table_privilege(r.r, 'public.' || t.tablename, priv)) = 0
       end as expected_met,
       case when current_setting('server_version_num')::int >= 170000 then 8 else 7 end as privileges_available
from roles r
cross join (values ('ut_members'), ('profiles')) t(tablename)
cross join privs
group by 1, 2
order by 1, 2;


-- Q8 ---------------------------------------------------------------------------
-- Batch 13 preservation — EFFECTIVE COLUMN ACCESS. A table-level REVOKE removes
-- column grants of the same name, but that behaviour is load-bearing enough to
-- verify rather than assume: every column on both tables, every privilege
-- applicable to a column, for anon and authenticated. expect expected_met = true.
--
-- The privilege list is DELIBERATELY VERSION-INDEPENDENT: MAINTAIN (new in
-- PostgreSQL 17) is a TABLE privilege, and has_column_privilege() rejects it on
-- every version — naming it raises `unrecognized privilege type: "MAINTAIN"`.
with roles(r) as (values ('anon'), ('authenticated')),
     privs(priv) as (select unnest(array['SELECT','INSERT','UPDATE','REFERENCES']))
select r.r as role_name,
       count(*) as column_access_checks,
       count(*) filter (where has_column_privilege(r.r, a.attrelid, a.attname, priv)) as granted,
       count(*) filter (where has_column_privilege(r.r, a.attrelid, a.attname, priv)) = 0 as expected_met
from roles r
cross join (select attrelid, attname from pg_attribute
             where attrelid in ('public.ut_members'::regclass, 'public.profiles'::regclass)
               and attnum > 0 and not attisdropped) a
cross join privs
group by 1
order by 1;


-- Q9 ---------------------------------------------------------------------------
-- Batch 13 preservation — PUBLIC ACLs, on tables, columns and functions.
--
-- The function row is scoped to the BUNDLE-OWNED surface — every function this
-- release's files create, not only the callable entries. PUBLIC EXECUTE is detected
-- with aclexplode(), because a grantee of 0 IS PUBLIC — matching the text of the ACL
-- would also match `service_role=X/postgres`, and a NULL proacl means the DEFAULT
-- PUBLIC grant is still in place.
-- The final row is INFORMATIONAL and scoped to UNRELATED functions: those are
-- outside this release's authority to change, so counting them as a failure would
-- be a gate nothing could pass — but they are reported, so exposure is visible
-- rather than silently out of scope. (Earlier revisions listed the bundle's own
-- helpers here, which both under-reported the surface and mis-scoped the check.)
select 'table_grants_to_public' as acl_kind, count(*) as offending, count(*) = 0 as expected_met
from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('ut_members', 'profiles') and grantee = 'PUBLIC'
union all
select 'column_grants_to_public', count(*), count(*) = 0
from information_schema.column_privileges
where table_schema = 'public' and table_name in ('ut_members', 'profiles') and grantee = 'PUBLIC'
union all
select 'bundle_owned_functions_public_execute', count(*), count(*) = 0
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (p.proname like 'b14a%' or p.proname like 'apply_lifecycle_update%')
  and (p.proacl is null
       or exists (select 1 from aclexplode(p.proacl) x
                   where x.grantee = 0 and x.privilege_type = 'EXECUTE'))
union all
-- INFORMATIONAL, and now CORRECTLY SCOPED: it reports the functions the bundle did
-- NOT create. Those are out of this release's authority ("do not revoke permissions
-- on unrelated existing functions"), so the row is not a gate — but it is a real
-- number, so exposure is visible instead of hidden. expected_met is NULL on purpose.
select 'unrelated_functions_with_public_execute_informational', count(*), null::boolean
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and not (p.proname like 'b14a%' or p.proname like 'apply_lifecycle_update%')
  and (p.proacl is null
       or exists (select 1 from aclexplode(p.proacl) x
                   where x.grantee = 0 and x.privilege_type = 'EXECUTE'))
order by 1;


-- Q10 --------------------------------------------------------------------------
-- Batch 13 preservation — RLS AND THE POLICY SET. expect expected_met = true on
-- every row:
--   * row level security is ENABLED on both tables
--   * the withdrawn policy `allow_authenticated_read` is ABSENT
--   * NO policy on either table is visible to anon, authenticated or PUBLIC — a
--     policy whose role list includes them re-opens the read path Batch 13 closed
select 'rls_enabled_on_both_tables' as check_name,
       (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relname in ('ut_members', 'profiles') and c.relrowsecurity) as observed,
       2 as expect,
       (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relname in ('ut_members', 'profiles') and c.relrowsecurity) = 2 as expected_met
union all
select 'withdrawn_read_policy_present',
       count(*), 0, count(*) = 0
from pg_policies where schemaname = 'public' and policyname = 'allow_authenticated_read'
union all
select 'policies_visible_to_anon_authenticated_or_public',
       count(*), 0, count(*) = 0
from pg_policies
where schemaname = 'public' and tablename in ('ut_members', 'profiles')
  and (roles::text[] && array['anon', 'authenticated', 'public'])
order by 1;


-- Q10b -------------------------------------------------------------------------
-- informational: the exact policy inventory, with definitions, for comparison
-- against the preflight's P15. The bundle must change none of these.
select tablename, policyname, permissive, roles, cmd, coalesce(qual, '<none>') as using_expression
from pg_policies
where schemaname = 'public' and tablename in ('ut_members', 'profiles')
order by 1, 2;


-- Q20 --------------------------------------------------------------------------
-- informational: ownership of the two tables, so an owner change is visible even
-- though the bundle makes none.
select c.relname as table_name, pg_get_userbyid(c.relowner) as owner,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('ut_members', 'profiles')
order by 1;


-- Q80 --------------------------------------------------------------------------
-- AUTHORITY AND LEGACY EXPOSURE AFTER THE INSTALL — COUNTS ONLY.
-- Compare against the preflight's P7: `attested_rows` must be UNCHANGED in both
-- tables (this bundle performs no backfill; stamping legacy rows would manufacture
-- authority the system never established) and `rows` must be unchanged.
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


-- Q81 --------------------------------------------------------------------------
-- CROSS-TABLE CONFLICT EXPOSURE AFTER THE INSTALL — COUNTS ONLY. The address is a
-- group key only and is never projected. These must equal the preflight's P8: the
-- bundle resolves nothing about existing data, and must not hide a contradiction.
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


-- Q90 ==========================================================================
-- *** THE VERDICT — THE LAST STATEMENT IN THIS FILE. MUST READ `t`. ***
--
-- One boolean ANDing every condition the release depends on. FALSE, NULL or
-- MISSING is a failure. batch14ax-install-bundle-validate.sh reads the last line
-- of this file's output and requires exactly `t`; nothing may follow this
-- statement.
-- ============================================================================
select
  -- (1) the authority column, BY TYPE, on BOTH tables
  (select count(*) = 2 from pg_attribute a
    where a.attrelid in ('public.ut_members'::regclass, 'public.profiles'::regclass)
      and a.attname = 'entitlement_authority_at'
      and a.attnum > 0 and not a.attisdropped
      and format_type(a.atttypid, a.atttypmod) = 'timestamp with time zone')
  and
  -- (2) the address index, structurally
  (select count(*) = 1 from pg_index i
     join pg_class ic on ic.oid = i.indexrelid
     join pg_class t2 on t2.oid = i.indrelid
     join pg_namespace n on n.oid = ic.relnamespace
    where n.nspname = 'public' and ic.relname = 'ut_members_email_lower_key'
      and t2.relname = 'ut_members'
      and i.indisunique and i.indisvalid and i.indisready and i.indislive
      and i.indnkeyatts = 1 and i.indnatts = 1 and i.indpred is null
      and replace(pg_get_expr(i.indexprs, i.indrelid), ' ', '')
          in ('lower(btrim(email))', 'lower(btrim((email)::text))'))
  and
  -- (3) EXACT signatures — the COMPLETE retained surface present under its own name
  (select count(*) = 10 from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (p.proname, pg_get_function_identity_arguments(p.oid)) in (
            ('apply_lifecycle_update', 'p_targets jsonb'),
            ('apply_lifecycle_update_sync', 'p_targets jsonb'),
            ('apply_lifecycle_update_sync_global', 'p_targets jsonb'),
            ('b14ab_acquire_global_lock', 'p_shared boolean'),
            ('b14ab_linkage_global_key', ''),
            ('b14ab_linkage_key', 'p_kind text, p_value text'),
            ('b14ac_install_trigger', 'p_mode text'),
            ('b14ac_linkage_keys_for_payload', 'p_targets jsonb'),
            ('b14ac_trg_stmt_exclusive', ''),
            ('b14ac_trg_stmt_shared', '')))
  and
  -- (4) the COMPLETE retained surface: owner, PINNED search_path on every function,
  --     declared security mode, no anon/authenticated/PUBLIC EXECUTE, and
  --     service_role EXACTLY where the boundary intends it — the release closure,
  --     not "whatever happens to be callable"
  (select count(*) = 10 from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     join (values
             ('apply_lifecycle_update',             true,  true),
             ('apply_lifecycle_update_sync',        false, false),
             ('apply_lifecycle_update_sync_global', false, true),
             ('b14ab_acquire_global_lock',          false, true),
             ('b14ab_linkage_global_key',           false, true),
             ('b14ab_linkage_key',                  false, false),
             ('b14ac_install_trigger',              false, false),
             ('b14ac_linkage_keys_for_payload',     false, false),
             ('b14ac_trg_stmt_exclusive',           false, false),
             ('b14ac_trg_stmt_shared',              false, false)
          ) e(proname, is_definer, svc) on e.proname = p.proname
    where n.nspname = 'public'
      and pg_get_userbyid(p.proowner) = 'postgres'
      and replace(array_to_string(p.proconfig, ','), ' ', '') = 'search_path=pg_catalog,public'
      and p.prosecdef = e.is_definer
      and has_function_privilege('service_role', p.oid, 'EXECUTE') = e.svc
      and not has_function_privilege('anon', p.oid, 'EXECUTE')
      and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
      and not (p.proacl is null
               or exists (select 1 from aclexplode(p.proacl) x
                           where x.grantee = 0 and x.privilege_type = 'EXECUTE')))
  and
  -- (5) the trigger installer is present, owned, and NOT callable by an app role
  (select count(*) = 1 from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'b14ac_install_trigger'
      and pg_get_function_identity_arguments(p.oid) = 'p_mode text'
      and pg_get_userbyid(p.proowner) = 'postgres'
      and not has_function_privilege('anon', p.oid, 'EXECUTE')
      and not has_function_privilege('authenticated', p.oid, 'EXECUTE'))
  and
  -- (6) ENABLED BEFORE STATEMENT triggers covering INSERT AND UPDATE on BOTH
  --     tables, calling the exclusive-global function
  (select count(*) = 2 from pg_trigger t
     join pg_class c on c.oid = t.tgrelid
     join pg_namespace n on n.oid = c.relnamespace
     join pg_proc p on p.oid = t.tgfoid
    where n.nspname = 'public' and c.relname in ('ut_members', 'profiles')
      and not t.tgisinternal and t.tgname = 'b14ac_stmt_trg'
      and t.tgenabled = 'O'
      and (t.tgtype & 1) = 0 and (t.tgtype & 2) = 2
      and (t.tgtype & 4) = 4 and (t.tgtype & 16) = 16
      and p.proname = 'b14ac_trg_stmt_exclusive')
  and
  -- (7) Batch 13: EFFECTIVE table access withdrawn from anon and authenticated
  (select count(*) = 0 from
     (values ('anon'), ('authenticated')) r(role_name)
     cross join (values ('ut_members'), ('profiles')) t(tablename)
     cross join (select unnest(
        case when current_setting('server_version_num')::int >= 170000
             then array_append(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'], 'MAINTAIN')
             else array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']
        end) as priv) p
    where has_table_privilege(r.role_name, 'public.' || t.tablename, p.priv))
  and
  -- (8) Batch 13: EFFECTIVE column access withdrawn from anon and authenticated.
  --     VERSION-INDEPENDENT list: MAINTAIN is a TABLE privilege and
  --     has_column_privilege() rejects it on every version.
  (select count(*) = 0 from
     (values ('anon'), ('authenticated')) r(role_name)
     cross join (select attrelid, attname from pg_attribute
                  where attrelid in ('public.ut_members'::regclass, 'public.profiles'::regclass)
                    and attnum > 0 and not attisdropped) a
     cross join (select unnest(array['SELECT','INSERT','UPDATE','REFERENCES']) as priv) p
    where has_column_privilege(r.role_name, a.attrelid, a.attname, p.priv))
  and
  -- (9) Batch 13: no grant to PUBLIC, on tables, columns or functions
  (select count(*) = 0 from information_schema.role_table_grants
    where table_schema = 'public' and table_name in ('ut_members', 'profiles') and grantee = 'PUBLIC')
  and
  (select count(*) = 0 from information_schema.column_privileges
    where table_schema = 'public' and table_name in ('ut_members', 'profiles') and grantee = 'PUBLIC')
  and
  -- (9b) no PUBLIC EXECUTE on ANY bundle-owned function — the whole surface, not
  --      only the callable entries. grantee 0 IS PUBLIC; a NULL proacl means the
  --      DEFAULT PUBLIC grant is still in place.
  (select count(*) = 0 from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (p.proname like 'b14a%' or p.proname like 'apply_lifecycle_update%')
      and (p.proacl is null
           or exists (select 1 from aclexplode(p.proacl) x
                       where x.grantee = 0 and x.privilege_type = 'EXECUTE')))
  and
  -- (11) the Batch 14ab prototype entry points are EXCLUDED from the installed
  --      surface (RESTRICT in the boundary: a dependent object aborts the migration)
  (to_regprocedure('public.b14ab_install_trigger(text)') is null
   and to_regprocedure('public.b14ab_trg_row()') is null
   and to_regprocedure('public.b14ab_trg_stmt()') is null
   and to_regprocedure('public.b14ab_lifecycle_apply(text,text,text,text,bigint[],text,text)') is null
   and to_regprocedure('public.b14ab_lifecycle_apply_nosync(text,text,text,text,bigint[],text,text)') is null
   and to_regprocedure('public.b14ab_acquire_linkage_locks(text,text,text,text)') is null
   and to_regprocedure('public.b14ab_linkage_keys(text,text,text,text)') is null)
  and
  -- (12) NO other bundle-owned function was left behind: the surface is exactly
  --      the ten above, so a stray helper cannot hide from every other condition
  (select count(*) = 0 from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (p.proname like 'b14a%' or p.proname like 'apply_lifecycle_update%')
      and (p.proname, pg_get_function_identity_arguments(p.oid)) not in (
            ('apply_lifecycle_update', 'p_targets jsonb'),
            ('apply_lifecycle_update_sync', 'p_targets jsonb'),
            ('apply_lifecycle_update_sync_global', 'p_targets jsonb'),
            ('b14ab_acquire_global_lock', 'p_shared boolean'),
            ('b14ab_linkage_global_key', ''),
            ('b14ab_linkage_key', 'p_kind text, p_value text'),
            ('b14ac_install_trigger', 'p_mode text'),
            ('b14ac_linkage_keys_for_payload', 'p_targets jsonb'),
            ('b14ac_trg_stmt_exclusive', ''),
            ('b14ac_trg_stmt_shared', '')))
  and
  -- (10) Batch 13: RLS enabled, the withdrawn policy absent, no policy visible to
  --      anon/authenticated/PUBLIC
  (select count(*) = 2 from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('ut_members', 'profiles') and c.relrowsecurity)
  and
  (select count(*) = 0 from pg_policies
    where schemaname = 'public' and policyname = 'allow_authenticated_read')
  and
  (select count(*) = 0 from pg_policies
    where schemaname = 'public' and tablename in ('ut_members', 'profiles')
      and (roles::text[] && array['anon', 'authenticated', 'public']))
  as verdict;
