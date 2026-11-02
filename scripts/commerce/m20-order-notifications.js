#!/usr/bin/env node
/**
 * m20-order-notifications.js — the outbox state machine, including the three ways a send can die.
 *
 *   1. crash BEFORE the provider call               → lease expires → `uncertain`, never stuck
 *   2. crash DURING the provider call               → same, because acceptance is unknowable
 *   3. crash AFTER acceptance, before the DB write  → same, and it is NOT auto-resent
 *
 * The third is the honest limit: Brevo offers no idempotency key, so a message may exist that we never
 * recorded. That is why `uncertain` is alerted and reconciled by delivery webhook rather than retried
 * into a second receipt.
 */
const path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

const outbox = require(path.join(ROOT, "src/lib/order-outbox.ts"));
const {
  enqueue, claimNext, recoverStale, drainOutbox, applyDeliveryEvent,
  backoffMs, idempotencyKeyFor, SEND_LEASE_MS, MAX_ATTEMPTS,
} = outbox;

function makeDb(opts = {}) {
  const rows = [];
  return {
    rows,
    from() {
      const state = { op: null, payload: null, filters: [] };
      const api = {
        upsert(row) { state.op = "upsert"; state.payload = row; return api; },
        update(patch) { state.op = "update"; state.payload = patch; return api; },
        select() { if (!state.op) state.op = "select"; return api; },
        eq(k, v) { state.filters.push([k, v]); return api; },
        order() { return api; },
        limit() { return api; },
        then(res, rej) { return run().then(res, rej); },
      };

      async function run() {
        if (opts.broken) return { data: null, error: { message: "relation does not exist" } };

        if (state.op === "upsert") {
          const dup = rows.some(
            (r) =>
              (r.order_id === state.payload.order_id && r.kind === state.payload.kind) ||
              (state.payload.idempotency_key && r.idempotency_key === state.payload.idempotency_key)
          );
          if (dup) return { data: [], error: null };
          const row = { id: "n" + (rows.length + 1), ...state.payload };
          rows.push(row);
          return { data: [{ id: row.id }], error: null };
        }

        if (state.op === "select") {
          return {
            data: rows.filter((r) => state.filters.every(([k, v]) => String(r[k]) === String(v))),
            error: null,
          };
        }

        if (state.op === "update") {
          const matches = rows.filter((r) => state.filters.every(([k, v]) => String(r[k]) === String(v)));
          matches.forEach((r) => Object.assign(r, state.payload));
          // PostgREST returns the full updated row when select() is used.
          return { data: matches.map((r) => ({ ...r })), error: null };
        }

        return { data: [], error: null };
      }

      return api;
    },
  };
}

let passed = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
}

(async () => {
  console.log("queueing");
  {
    const db = makeDb();
    const a = await enqueue(db, { orderId: "o1", kind: "confirmation" });
    const b = await enqueue(db, { orderId: "o1", kind: "confirmation" });
    check("a purchase enqueues exactly one row", a.queued === true && db.rows.length === 1);
    check("re-queueing is refused, not duplicated", b.queued === false && db.rows.length === 1);
    check("the idempotency key is deterministic", db.rows[0].idempotency_key === idempotencyKeyFor("o1", "confirmation"));
    check("a new row starts as pending", db.rows[0].status === "pending");
  }
  {
    const db = makeDb({ broken: true });
    const r = await enqueue(db, { orderId: "o1", kind: "confirmation" });
    check("no ledger (migration unapplied) → nothing is queued", r.queued === false && /outbox unavailable/.test(r.reason));
  }

  console.log("claiming");
  {
    const db = makeDb();
    await enqueue(db, { orderId: "o2", kind: "confirmation" });
    const first = await claimNext(db);
    const second = await claimNext(db);
    check("the first worker claims the row", !!first && first.status === "sending");
    check("a second worker cannot claim it", second === null);
    check("the claim records a lease and an attempt", !!db.rows[0].claimed_at && db.rows[0].attempts === 1);
  }

  console.log("outcomes");
  {
    const db = makeDb();
    await enqueue(db, { orderId: "o3", kind: "confirmation" });
    const res = await drainOutbox({ db, send: async () => ({ outcome: "accepted", messageId: "mid-1" }) });
    check("accepted → sent with the provider message id", res.sent === 1 && db.rows[0].status === "sent" && db.rows[0].provider_message_id === "mid-1");
  }
  {
    const db = makeDb();
    await enqueue(db, { orderId: "o4", kind: "confirmation" });
    const res = await drainOutbox({ db, send: async () => ({ outcome: "rejected", reason: "sender not verified" }) });
    check("rejected → failed, not lost", res.failed === 1 && db.rows[0].status === "failed");
    check("a retry is scheduled with backoff", new Date(db.rows[0].next_attempt_at) > new Date());
    check("the provider's reason is recorded", /sender not verified/.test(db.rows[0].last_error));
  }
  {
    const db = makeDb();
    await enqueue(db, { orderId: "o5", kind: "confirmation" });
    const res = await drainOutbox({ db, send: async () => ({ outcome: "unknown", reason: "provider timed out" }) });
    check("a timeout → uncertain, never sent", res.uncertain === 1 && db.rows[0].status === "uncertain");
  }

  console.log("crash before sending");
  {
    const db = makeDb();
    await enqueue(db, { orderId: "o6", kind: "confirmation" });
    await claimNext(db);
    check("the row is left in sending", db.rows[0].status === "sending");
    const moved = await recoverStale(db, new Date(Date.now() + SEND_LEASE_MS + 1000));
    check("an expired lease is recovered", moved === 1);
    check("and becomes uncertain, not pending", db.rows[0].status === "uncertain");
    const again = await drainOutbox({ db, send: async () => ({ outcome: "accepted", messageId: "x" }) });
    check("an uncertain row is never resent automatically", again.processed === 0 && db.rows[0].status === "uncertain");
  }

  console.log("crash during sending (provider may have accepted)");
  {
    const db = makeDb();
    await enqueue(db, { orderId: "o7", kind: "confirmation" });
    await claimNext(db);
    const moved = await recoverStale(db, new Date(Date.now() + SEND_LEASE_MS + 1000));
    check("a send interrupted mid-flight becomes uncertain", moved === 1 && db.rows[0].status === "uncertain");
    check("no second attempt is made", db.rows[0].attempts === 1);
    check("the reason states acceptance is unknown", /unknown/i.test(db.rows[0].last_error || ""));
  }

  console.log("retry after a recorded failure");
  {
    const db = makeDb();
    await enqueue(db, { orderId: "o8", kind: "confirmation" });
    await drainOutbox({ db, send: async () => ({ outcome: "rejected", reason: "429 rate limited" }) });
    const later = new Date(new Date(db.rows[0].next_attempt_at).getTime() + 1000);
    const res = await drainOutbox({ db, now: later, send: async () => ({ outcome: "accepted", messageId: "mid-2" }) });
    check("once due, the retry sends", res.sent === 1 && db.rows[0].status === "sent");
    check("the failed attempt is still on the record", db.rows[0].attempts === 2);
  }
  {
    const db = makeDb();
    await enqueue(db, { orderId: "o9", kind: "confirmation" });
    db.rows[0].attempts = MAX_ATTEMPTS;
    await drainOutbox({ db, send: async () => ({ outcome: "rejected", reason: "permanent rejection" }) });
    check("exhausted retries surface as uncertain", db.rows[0].status === "uncertain");
  }

  console.log("delivery reconciliation");
  {
    const db = makeDb();
    await enqueue(db, { orderId: "o10", kind: "confirmation" });
    await drainOutbox({ db, send: async () => ({ outcome: "accepted", messageId: "mid-3" }) });
    const ok = await applyDeliveryEvent(db, { messageId: "mid-3", event: "delivered" });
    check("a delivery event is recorded", ok === true && db.rows[0].delivery_status === "delivered");
    check("and does not rewrite the send state", db.rows[0].status === "sent");
    const bounce = await applyDeliveryEvent(db, { messageId: "mid-3", event: "hard_bounce" });
    check("a later bounce is recorded too", bounce === true && db.rows[0].delivery_status === "hard_bounce");
    const unknown = await applyDeliveryEvent(db, { messageId: "nope", event: "delivered" });
    check("an unknown message id changes nothing", unknown === false);
  }

  console.log("policy");
  {
    check("backoff grows and is capped", backoffMs(1) === 60_000 && backoffMs(2) === 120_000 && backoffMs(9) === 16 * 60_000);
    check("the guarantee is at-most-once with reconciliation", /at-most-once/.test(outbox.DELIVERY_GUARANTEE));
  }

  console.log(`\n${failures.length === 0 ? "ALL PASS" : "FAILURES"} — ${passed} passed, ${failures.length} failed`);
  if (failures.length) { failures.forEach((f) => console.log(`  - ${f}`)); process.exit(1); }
})().catch((err) => { console.error("harness crashed:", err); process.exit(1); });
