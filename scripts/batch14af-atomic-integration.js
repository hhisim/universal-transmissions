#!/usr/bin/env node
/**
 * batch14af-atomic-integration.js
 *
 * THE INTEGRATED TYPESCRIPT PATH, AGAINST THE ACTUAL POSTGRESQL PRIMITIVE.
 *
 * The module under test is the real `src/lib/membership-lifecycle-atomic.ts`.
 * Its `rpc()` dependency is a PostgreSQL-BACKED adapter: every call becomes one
 * psql invocation of the real `public.apply_lifecycle_update_sync_global`, so no
 * SQL semantics are reimplemented in JavaScript. A JS re-implementation would
 * only prove that two implementations agree.
 *
 * One psql process per call, so each call is its own transaction — the same
 * shape PostgREST has.
 */
"use strict";

const path = require("node:path");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const SOCK = process.env.B14AF_SOCK;
const BASE = process.env.B14AF_BASE;
if (!SOCK || !BASE) {
  console.error("B14AF_SOCK and B14AF_BASE must be set (run the .sh harness)");
  process.exit(2);
}

// The real module, compiled from src/lib by the harness. Nothing here is a
// second implementation: this is the TypeScript source, transpiled.
const ATOMIC_JS = process.env.B14AF_ATOMIC_JS || path.join(ROOT, "src/lib/membership-lifecycle-atomic.js");
const atomic = require(ATOMIC_JS);

const CUS = "cus_A";
const SUB = "sub_A";
const MEMBER_PK = "11111111-1111-1111-1111-111111111111";
const OTHER_PK = "22222222-2222-2222-2222-222222222222";

let pass = 0;
const failures = [];
function check(name, expected, actual) {
  if (String(expected) === String(actual)) {
    pass++;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(name);
    console.log(`  FAIL ${name} (expected ${expected}, observed ${actual})`);
  }
}

function psql(sqlText) {
  const f = path.join(BASE, ".p.sql");
  fs.writeFileSync(f, sqlText + "\n");
  fs.chmodSync(f, 0o644);
  try {
    const out = execFileSync(
      "su",
      [
        "postgres",
        "-c",
        `PGAPPNAME=b14af psql -h ${SOCK} -d postgres -X -q -A -t -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -f ${f}`,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
    return { ok: true, out: out.trim() };
  } catch (err) {
    return { ok: false, out: "", err: `${err.stderr || ""}${err.stdout || ""}`.trim() };
  }
}

function scalar(sql) {
  const r = psql(sql);
  if (!r.ok) throw new Error(`scalar failed: ${r.err}`);
  return r.out;
}

/** THE ADAPTER. No SQL semantics live here — only transport and error mapping. */
function makePgClient() {
  return {
    async rpc(name, args) {
      const lit = JSON.stringify(args.p_targets).replace(/'/g, "''");
      const sql =
        `select coalesce(json_agg(row_to_json(t))::text, '[]') as payload ` +
        `from public.${name}('${lit}'::jsonb) t;`;
      const r = psql(sql);
      if (!r.ok) {
        const m = /ERROR:\s+([A-Z0-9]{5}):\s*([^\n]*)/.exec(r.err);
        return {
          data: null,
          error: {
            code: m ? m[1] : undefined,
            message: m ? m[2].trim() : r.err.split("\n")[0],
            details: r.err,
          },
        };
      }
      return { data: JSON.parse(r.out.split("\n").pop().trim()), error: null };
    },
  };
}

function seed(members, profiles) {
  const sql = [
    "truncate public.ut_members, public.profiles;",
    ...members.map(
      (m) =>
        `insert into public.ut_members (id,email,plan,subscription_status,stripe_customer_id,stripe_subscription_id) values ` +
        `('${m.id}','a@x.test',${s(m.plan)},${s(m.status)},${s(m.cus)},${s(m.sub)});`
    ),
    ...profiles.map(
      (p) =>
        `insert into public.profiles (user_id,email,plan,subscription_status,stripe_customer_id,stripe_subscription_id) values ` +
        `('${p.id}','a@x.test',${s(p.plan)},${s(p.status)},${s(p.cus)},${s(p.sub)});`
    ),
  ].join("\n");
  const r = psql(sql);
  if (!r.ok) throw new Error(`seed failed: ${r.err}`);
}
function s(v) {
  return v === null || v === undefined ? "null" : `'${v}'`;
}

/** Build a snapshot the way the webhook takes it: from rows read BEFORE Stripe. */
function snapshot(rows) {
  const built = rows.map((r) => ({
    pkValue: r.id,
    guard: {
      plan: r.plan ?? null,
      subscription_status: r.status ?? null,
      stripe_customer_id: r.cus ?? null,
      stripe_subscription_id: r.sub ?? null,
    },
    row: r,
  }));
  return { ok: true, rows: built, matched: built.length, lookedUp: built.length, all: built };
}

/** A snapshot where only some located rows are eligible (the filter case). */
function snapshotWithExclusions(located, eligiblePks) {
  const built = located.map((r) => ({
    pkValue: r.id,
    guard: {
      plan: r.plan ?? null,
      subscription_status: r.status ?? null,
      stripe_customer_id: r.cus ?? null,
      stripe_subscription_id: r.sub ?? null,
    },
    row: r,
  }));
  return {
    ok: true,
    rows: built.filter((b) => eligiblePks.includes(b.pkValue)),
    matched: built.length,
    lookedUp: built.length,
    all: built,
  };
}

const memberRow = (id) =>
  scalar(
    `select coalesce(plan,'<null>')||'|'||coalesce(subscription_status,'<null>')||'|'||` +
      `coalesce(stripe_subscription_id,'<null>') from public.ut_members where id='${id}'`
  );
const profileRow = (id) =>
  scalar(
    `select coalesce(plan,'<null>')||'|'||coalesce(subscription_status,'<null>')||'|'||` +
      `coalesce(stripe_subscription_id,'<null>') from public.profiles where user_id='${id}'`
  );

const CANCELLED = "guest|canceled|<null>";

async function main() {
  const client = makePgClient();
  const authority = { customerId: CUS, subscriptionIds: [SUB] };
  const revoke = {
    plan: "guest",
    subscription_status: "canceled",
    stripe_subscription_id: null,
    current_period_end: null,
  };

  // ---------------------------------------------------------------- S1
  console.log("S1 successful cancellation (both tables, one transaction)");
  seed([{ id: MEMBER_PK, plan: "initiate", status: "active", cus: CUS, sub: SUB }], [
    { id: MEMBER_PK, plan: "initiate", status: "active", cus: CUS, sub: SUB },
  ]);
  {
    const snap = snapshot([
      { id: MEMBER_PK, plan: "initiate", status: "active", cus: CUS, sub: SUB },
    ]);
    const res = await atomic.applyAtomicLifecycleUpdate(client, {
      authority,
      member: { snapshot: snap, fields: revoke },
      profile: { snapshot: snap, fields: { plan: "free" } },
    });
    check("S1 the atomic write succeeded", "true", res.ok);
    check("S1 ut_members revoked", CANCELLED, memberRow(MEMBER_PK));
    // The profiles target was asked to change ONLY the plan.
    check("S1 profiles mirror plan revoked", "free|active|sub_A", profileRow(MEMBER_PK));
    check("S1 updated rows reported", "1", res.member.updated);
  }

  // ---------------------------------------------------------------- S2
  console.log("S2 successful reactivation");
  {
    const memberSnap = snapshot([{ id: MEMBER_PK, plan: "guest", status: "canceled", cus: CUS, sub: null }]);
    // S1 left the mirror at `free|active|sub_A` — it has its own snapshot.
    const profileSnap = snapshot([{ id: MEMBER_PK, plan: "free", status: "active", cus: CUS, sub: SUB }]);
    const res = await atomic.applyAtomicLifecycleUpdate(client, {
      authority,
      member: {
        snapshot: memberSnap,
        fields: {
          plan: "initiate",
          subscription_status: "active",
          stripe_subscription_id: SUB,
          current_period_end: null,
        },
      },
      profile: { snapshot: profileSnap, fields: { plan: "initiate" } },
    });
    check("S2 the atomic write succeeded", "true", res.ok);
    check("S2 ut_members reactivated", ["initiate", "active", SUB].join("|"), memberRow(MEMBER_PK));
    check("S2 profiles mirror reactivated", ["initiate", "active", SUB].join("|"), profileRow(MEMBER_PK));
  }

  // ---------------------------------------------------------------- S3
  console.log("S3 second-table failure rolls the first table back");
  seed([{ id: MEMBER_PK, plan: "initiate", status: "active", cus: CUS, sub: SUB }], [
    { id: MEMBER_PK, plan: "initiate", status: "active", cus: CUS, sub: SUB },
  ]);
  {
    const memberSnap = snapshot([
      { id: MEMBER_PK, plan: "initiate", status: "active", cus: CUS, sub: SUB },
    ]);
    // The profiles guard is deliberately STALE: that target cannot succeed.
    const staleProfileSnap = snapshot([
      { id: MEMBER_PK, plan: "guest", status: "canceled", cus: "cus_GONE", sub: null },
    ]);
    const res = await atomic.applyAtomicLifecycleUpdate(client, {
      authority,
      member: { snapshot: memberSnap, fields: revoke },
      profile: { snapshot: staleProfileSnap, fields: { plan: "free" } },
    });
    check("S3 the atomic write failed", "false", res.ok);
    console.log(`      [S3 detail] ${res.profile.detail}`);
    check(
      "S3 the failure names the SECOND target (profiles) as the conflicting one",
      "true",
      /BATCH14 CONFLICT/.test(res.profile.detail) && /target profiles/.test(res.profile.detail)
    );
    check("S3 ut_members was ROLLED BACK (unchanged)", ["initiate", "active", SUB].join("|"), memberRow(MEMBER_PK));
    check("S3 profiles unchanged", ["initiate", "active", SUB].join("|"), profileRow(MEMBER_PK));
  }

  // ---------------------------------------------------------------- S4
  console.log("S4 stale invocation preserves the winner");
  seed([{ id: MEMBER_PK, plan: "initiate", status: "active", cus: CUS, sub: SUB }], [
    { id: MEMBER_PK, plan: "initiate", status: "active", cus: CUS, sub: SUB },
  ]);
  {
    const memberSnap = snapshot([
      { id: MEMBER_PK, plan: "initiate", status: "active", cus: CUS, sub: SUB },
    ]);
    const profileSnap = snapshot([
      { id: MEMBER_PK, plan: "initiate", status: "active", cus: CUS, sub: SUB },
    ]);
    // A concurrent winner lands between the snapshot and the write.
    psql(
      `update public.ut_members set plan='guest', subscription_status='canceled', ` +
        `stripe_subscription_id=null where id='${MEMBER_PK}';`
    );
    const winner = memberRow(MEMBER_PK);
    const res = await atomic.applyAtomicLifecycleUpdate(client, {
      authority,
      member: { snapshot: memberSnap, fields: revoke },
      profile: { snapshot: profileSnap, fields: { plan: "free" } },
    });
    check("S4 the stale write failed", "false", res.ok);
    check("S4 the failure is RETRYABLE (re-resolve and re-reconcile)", "true", res.retryable);
    check("S4 the winner's state is PRESERVED", winner, memberRow(MEMBER_PK));
    check("S4 the profiles mirror was not written", ["initiate", "active", SUB].join("|"), profileRow(MEMBER_PK));
  }

  // ---------------------------------------------------------------- S5
  console.log("S5 excluded rows receive no UPDATE (mixed eligibility)");
  seed(
    [
      { id: MEMBER_PK, plan: "initiate", status: "active", cus: CUS, sub: SUB },
      { id: OTHER_PK, plan: "gold", status: "active", cus: CUS, sub: null },
    ],
    [{ id: MEMBER_PK, plan: "initiate", status: "active", cus: CUS, sub: SUB }]
  );
  {
    const located = [
      { id: MEMBER_PK, plan: "initiate", status: "active", cus: CUS, sub: SUB },
      { id: OTHER_PK, plan: "gold", status: "active", cus: CUS, sub: null },
    ];
    const excludedBefore = memberRow(OTHER_PK);
    const res = await atomic.applyAtomicLifecycleUpdate(client, {
      authority,
      member: {
        snapshot: snapshotWithExclusions(located, [MEMBER_PK]),
        fields: revoke,
      },
      profile: {
        snapshot: snapshot([{ id: MEMBER_PK, plan: "initiate", status: "active", cus: CUS, sub: SUB }]),
        fields: { plan: "free" },
      },
    });
    check("S5 the atomic write succeeded", "true", res.ok);
    check("S5 the eligible row was written", CANCELLED, memberRow(MEMBER_PK));
    check("S5 report: updated count", "1", res.member.updated);
    check("S5 report: located count", "2", res.member.resolved);
    check("S5 the EXCLUDED row received no UPDATE", excludedBefore, memberRow(OTHER_PK));
    check("S5 the excluded row kept its out-of-vocabulary plan", "gold|active|<null>", memberRow(OTHER_PK));
  }

  console.log("");
  console.log(`assertions passed: ${pass}`);
  console.log(`assertions failed: ${failures.length}`);
  for (const f of failures) console.log(`  - ${f}`);
  console.log("");
  console.log(failures.length === 0 ? "BATCH14AF_ATOMIC_INTEGRATION_PASSED" : "BATCH14AF_ATOMIC_INTEGRATION_FAILED");
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`HARNESS ERROR: ${err && err.message ? err.message : err}`);
  process.exit(2);
});
