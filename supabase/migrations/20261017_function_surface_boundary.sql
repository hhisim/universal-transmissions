-- ---------------------------------------------------------------------------
-- 20261017_function_surface_boundary.sql
--
-- BATCH 14 — FINALIZE THE PRODUCTION SQL SURFACE.
--
-- LAST step of the installation bundle. It creates no behaviour: it fixes the
-- CALLABLE SURFACE the earlier files leave behind. It is a separate migration on
-- purpose, so that every reviewed file (20261010 – 20261016) stays byte-identical
-- and the review record's hashes and the reviewed primitive are untouched.
--
-- WHAT THE EARLIER FILES LEAVE BEHIND (measured on an isolated install — see
-- docs/BATCH14AY-SQL-SURFACE.md):
--
--   * 13 of the 17 bundle-owned functions still carry the DEFAULT PUBLIC EXECUTE
--     grant, so `anon`, `authenticated` and any role at all can call them. That
--     includes `b14ab_acquire_global_lock()`, which takes the single global
--     advisory key: an anonymous caller can hold it and stall every membership
--     write (a denial-of-service lever, not a data leak), and includes the Batch
--     14ab prototype appliers, which are write-capable.
--   * two helpers the RELEASED paths depend on are reachable by `service_role`
--     only THROUGH that PUBLIC grant; they were never granted to it explicitly.
--   * seven Batch 14ab prototype functions are installed that no released path
--     can reach.
--
-- WHAT THIS FILE DOES
--
--   1. Revokes PUBLIC, anon and authenticated on ALL 17 bundle-owned functions.
--   2. Grants `service_role` EXACTLY the closure the released paths need, and no
--      more: the global entry point the application calls, the reviewed primitive
--      that entry point calls in turn (the wrapper is SECURITY INVOKER, so the
--      grant is required), and the two advisory-lock helpers on the wrapper's and
--      the trigger's INVOKER path. Those two helpers MUST be granted here: closing
--      PUBLIC without granting them would make every atomic RPC and every direct
--      write fail with 42501.
--   3. Withdraws `service_role` from the per-identity variant
--      `apply_lifecycle_update_sync`. The released application calls the GLOBAL
--      entry point; the per-identity variant does not compose with the installed
--      exclusive-global trigger (measured — BATCH14AC §3, D3c), so leaving it
--      callable by the application role is a fail-OPEN footgun. The function stays
--      DEFINED and stays callable by a superuser operator for diagnostics.
--   4. Drops the seven prototype-only functions of the Batch 14ab protocol that no
--      released path can reach, so they are not part of the installed surface.
--      DROP is RESTRICT (no CASCADE): if a trigger or another function still
--      depends on one, this migration ABORTS instead of removing it silently.
--   5. Pins `search_path = pg_catalog, public` on every retained bundle-owned
--      function that does not already pin it, so none of them resolves a name
--      through a session-controlled path.
--
-- It then ASSERTS the resulting surface and aborts if it is not exactly as
-- intended, including that no other bundle-owned function was left behind: this
-- migration is fail-closed, not best-effort.
--
-- NOT TOUCHED: any function the bundle did not create. "Do not revoke permissions
-- on unrelated existing functions" is asserted by the harness, which keeps an
-- unrelated legacy function with PUBLIC EXECUTE and proves it is unchanged.
--
-- ROLLBACK (last step, so first to reverse):
--   * restore the withdrawn grant:
--       grant execute on function public.apply_lifecycle_update_sync(jsonb) to service_role;
--   * the dropped prototypes return by re-applying 20261013 (they are created with
--     `create or replace`, so re-applying is idempotent);
--   * `revoke` and `alter ... set search_path` are reversed by re-applying
--     20261012 – 20261016, which recreate the grants and leave the path unpinned.
-- Dropping this file from the sequence is safe: the surface is then whatever
-- 20261016 left behind.
-- ---------------------------------------------------------------------------

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- ---------------------------------------------------------------- 1. revoke --
-- All 17, not only the survivors: nothing the bundle created stays reachable by
-- PUBLIC, anon or authenticated.
--
-- Driven from an existence-guarded loop rather than 17 bare statements: seven of
-- these functions are DROPPED later in this same file, so a bare `revoke ... on
-- function` would make the migration fail on its SECOND run — a migration that
-- cannot be re-applied is not a boundary. `to_regprocedure` returns NULL for a
-- signature that does not exist instead of raising, so re-running is a no-op.
do $b14ay$
declare
  r record;
  v_signature text;
begin
  for r in
    select * from (values
      ('apply_lifecycle_update',                'jsonb'),
      ('apply_lifecycle_update_sync',           'jsonb'),
      ('apply_lifecycle_update_sync_global',    'jsonb'),
      ('b14ab_acquire_global_lock',             'boolean'),
      ('b14ab_acquire_linkage_locks',           'text, text, text, text'),
      ('b14ab_install_trigger',                 'text'),
      ('b14ab_lifecycle_apply',                 'text, text, text, text, bigint[], text, text'),
      ('b14ab_lifecycle_apply_nosync',          'text, text, text, text, bigint[], text, text'),
      ('b14ab_linkage_global_key',              ''),
      ('b14ab_linkage_key',                     'text, text'),
      ('b14ab_linkage_keys',                    'text, text, text, text'),
      ('b14ab_trg_row',                         ''),
      ('b14ab_trg_stmt',                        ''),
      ('b14ac_install_trigger',                 'text'),
      ('b14ac_linkage_keys_for_payload',        'jsonb'),
      ('b14ac_trg_stmt_exclusive',              ''),
      ('b14ac_trg_stmt_shared',                 '')
    ) as t(nm, args)
  loop
    v_signature := 'public.' || quote_ident(r.nm) || '(' || r.args || ')';
    if to_regprocedure(v_signature) is not null then
      execute format('revoke all on function public.%I(%s) from public, anon, authenticated',
                     r.nm, r.args);
    end if;
  end loop;
end
$b14ay$;

-- ------------------------------------------------- 2. the release closure ----
-- service_role gets exactly this, and nothing else.
grant execute on function public.apply_lifecycle_update(jsonb)              to service_role;
grant execute on function public.apply_lifecycle_update_sync_global(jsonb) to service_role;
grant execute on function public.b14ab_acquire_global_lock(boolean)        to service_role;
grant execute on function public.b14ab_linkage_global_key()                to service_role;

-- ------------------------------- 3. withdraw the non-composing entry point --
revoke all on function public.apply_lifecycle_update_sync(jsonb) from service_role;

-- ------------------------------------------- 4. exclude the prototype set ---
-- RESTRICT on purpose: a dependent object must stop the migration, not be removed
-- along with it.
drop function if exists public.b14ab_install_trigger(text);
drop function if exists public.b14ab_trg_row();
drop function if exists public.b14ab_trg_stmt();
drop function if exists public.b14ab_lifecycle_apply(text, text, text, text, bigint[], text, text);
drop function if exists public.b14ab_lifecycle_apply_nosync(text, text, text, text, bigint[], text, text);
drop function if exists public.b14ab_acquire_linkage_locks(text, text, text, text);
drop function if exists public.b14ab_linkage_keys(text, text, text, text);

-- --------------------------------------------------- 5. pin the search path --
-- The three released functions already pin it; these seven did not.
alter function public.b14ab_acquire_global_lock(boolean)    set search_path = pg_catalog, public;
alter function public.b14ab_linkage_global_key()            set search_path = pg_catalog, public;
alter function public.b14ab_linkage_key(text, text)         set search_path = pg_catalog, public;
alter function public.b14ac_linkage_keys_for_payload(jsonb) set search_path = pg_catalog, public;
alter function public.b14ac_trg_stmt_exclusive()            set search_path = pg_catalog, public;
alter function public.b14ac_trg_stmt_shared()               set search_path = pg_catalog, public;
alter function public.b14ac_install_trigger(text)           set search_path = pg_catalog, public;

-- ------------------------------------------------------ 6. assert, or abort --
do $b14ay$
declare
  r         record;
  v_oid     oid;
  v_args    text;
  v_missing text := '';
  v_bad     text := '';
  v_extra   text;
begin
  for r in
    select * from (values
      ('apply_lifecycle_update',             'p_targets jsonb',                 true),
      ('apply_lifecycle_update_sync',        'p_targets jsonb',                 false),
      ('apply_lifecycle_update_sync_global', 'p_targets jsonb',                 true),
      ('b14ab_acquire_global_lock',          'p_shared boolean',                true),
      ('b14ab_linkage_global_key',           '',                                true),
      ('b14ab_linkage_key',                  'p_kind text, p_value text',       false),
      ('b14ac_install_trigger',              'p_mode text',                     false),
      ('b14ac_linkage_keys_for_payload',     'p_targets jsonb',                 false),
      ('b14ac_trg_stmt_exclusive',           '',                                false),
      ('b14ac_trg_stmt_shared',              '',                                false)
    ) as t(proname, args, svc)
  loop
    v_oid := null;
    select p.oid into v_oid
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = r.proname;

    if v_oid is null then
      v_missing := v_missing || r.proname || ' ';
      continue;
    end if;

    select pg_get_function_identity_arguments(v_oid) into v_args;
    if v_args is distinct from r.args then
      v_bad := v_bad || r.proname || '(signature=' || coalesce(v_args, '?') || ') ';
      continue;
    end if;

    if exists (
      select 1 from pg_proc p
       where p.oid = v_oid
         and (    pg_get_userbyid(p.proowner) <> 'postgres'
               or coalesce(replace(array_to_string(p.proconfig, ','), ' ', ''), '')
                    <> 'search_path=pg_catalog,public'
               or has_function_privilege('anon', p.oid, 'EXECUTE')
               or has_function_privilege('authenticated', p.oid, 'EXECUTE')
               or exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                           where a.grantee = 0 and a.privilege_type = 'EXECUTE')
             )
    ) then
      v_bad := v_bad || r.proname || '(surface) ';
      continue;
    end if;

    if has_function_privilege('service_role', v_oid, 'EXECUTE') <> r.svc then
      v_bad := v_bad || r.proname || '(service_role grant) ';
    end if;
  end loop;

  -- Every prototype signature is GONE.
  if to_regprocedure('public.b14ab_install_trigger(text)')                        is not null
  or to_regprocedure('public.b14ab_trg_row()')                                    is not null
  or to_regprocedure('public.b14ab_trg_stmt()')                                   is not null
  or to_regprocedure('public.b14ab_lifecycle_apply(text,text,text,text,bigint[],text,text)')        is not null
  or to_regprocedure('public.b14ab_lifecycle_apply_nosync(text,text,text,text,bigint[],text,text)') is not null
  or to_regprocedure('public.b14ab_acquire_linkage_locks(text,text,text,text)')   is not null
  or to_regprocedure('public.b14ab_linkage_keys(text,text,text,text)')            is not null
  then
    v_bad := v_bad || '(prototype still present) ';
  end if;

  -- No OTHER bundle-owned function was left behind.
  select string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', ', ')
    into v_extra
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and (p.proname like 'b14a%' or p.proname like 'apply_lifecycle_update%')
     and p.proname not in ('apply_lifecycle_update', 'apply_lifecycle_update_sync',
                           'apply_lifecycle_update_sync_global', 'b14ab_acquire_global_lock',
                           'b14ab_linkage_global_key', 'b14ab_linkage_key',
                           'b14ac_install_trigger', 'b14ac_linkage_keys_for_payload',
                           'b14ac_trg_stmt_exclusive', 'b14ac_trg_stmt_shared');
  if v_extra is not null then
    v_bad := v_bad || '(unexpected bundle-owned function: ' || v_extra || ') ';
  end if;

  if v_missing <> '' then
    raise exception 'BATCH14AY boundary: missing function(s): %', v_missing;
  end if;
  if v_bad <> '' then
    raise exception 'BATCH14AY boundary: surface not as intended: %', v_bad;
  end if;
end
$b14ay$;

commit;
