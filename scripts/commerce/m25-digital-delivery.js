#!/usr/bin/env node
/**
 * m25-digital-delivery.js — the delivery contract.
 *
 *   payment is not delivery
 *   fulfilment happens only when a buyer is actually handed the file
 *   a missing asset is reported honestly and leaves the order `paid`
 */
const path = require("path");
const http = require("http");
const ROOT = path.resolve(__dirname, "..", "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

const PORT = 8805;
const state = {
  orders: {},
  signFails: false,
  fulfilWrites: 0,
};

function j(res, body, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function server() {
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        const url = new URL("http://x" + req.url);
        const p = url.pathname;

        if (p.startsWith("/auth/v1/user")) {
          const auth = req.headers["authorization"] || "";
          if (!auth.includes("good")) return j(res, { msg: "bad jwt" }, 401);
          const who = auth.includes("member") ? "owner@example.com" : "stranger@example.com";
          return j(res, { id: "u1", email: who });
        }

        if (p.startsWith("/storage/v1/object/sign/")) {
          if (state.signFails) return j(res, { message: "storage down" }, 500);
          return j(res, { signedURL: "https://signed.example.com/file?sig=abc", signedUrl: "https://signed.example.com/file?sig=abc" });
        }

        if (p.startsWith("/rest/v1/ut_orders")) {
          const id = (url.searchParams.get("id") || "").replace("eq.", "");
          const order = state.orders[id];

          if (req.method === "PATCH") {
            const statusFilter = (url.searchParams.get("status") || "").replace("eq.", "");
            let changed = 0;
            for (const o of Object.values(state.orders)) {
              if (o.id === id && (!statusFilter || o.status === statusFilter)) {
                Object.assign(o, JSON.parse(raw || "{}"));
                changed++;
              }
            }
            if (changed) state.fulfilWrites++;
            return j(res, changed ? [state.orders[id]] : []);
          }

          const single = (req.headers["accept"] || "").includes("pgrst.object");
          if (!order) {
            if (single) return j(res, { code: "PGRST116", message: "no rows" }, 406);
            return j(res, []);
          }
          return j(res, single ? order : [order]);
        }

        return j(res, []);
      });
    });
    s.listen(PORT, "127.0.0.1", () => resolve(s));
  });
}

let passed = 0;
const failures = [];
const check = (n, ok, d) => {
  if (ok) { passed++; console.log("  PASS  " + n); }
  else { failures.push(n + (d ? " — " + d : "")); console.log("  FAIL  " + n + (d ? " — " + d : "")); }
};

const OWNER_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const STRANGER_ID = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";

function order(over) {
  return { id: OWNER_ID, customer_email: "owner@example.com", status: "paid", is_digital: true, product_id: "codex-digital", product_title: "Codex Digital", ...over };
}

function req(auth, id) {
  return new NextRequest("http://x/api/orders/" + id + "/download", {
    headers: auth ? { authorization: "Bearer " + auth } : {},
  });
}

const NextRequest = require("next/server").NextRequest;

(async () => {
  const srv = await server();
  const base = `http://127.0.0.1:${PORT}`;
  process.env.NEXT_PUBLIC_SUPABASE_URL = base;
  process.env.UT_SUPABASE_URL = base;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "k";
  process.env.UT_SUPABASE_SERVICE_ROLE_KEY = "k";

  const delivery = require(path.join(ROOT, "src/lib/digital-delivery.ts"));
  const { GET } = require(path.join(ROOT, "src/app/api/orders/[id]/download/route.ts"));

  console.log("no asset configured (today's reality)");
  state.orders[OWNER_ID] = order({});
  {
    const r = await GET(req("good-member", OWNER_ID), { params: { id: OWNER_ID } });
    const body = await r.json();
    check("an authenticated owner is recognised", r.status === 409, "status " + r.status);
    check("the missing asset is reported, not hidden", /not yet available/i.test(body.error || ""));
    check("the order stays paid", state.orders[OWNER_ID].status === "paid", state.orders[OWNER_ID].status);
    check("nothing was written to the order", state.fulfilWrites === 0);
    check("the catalogue knows it is not deliverable", delivery.isDeliverable("codex-digital") === false);
  }

  console.log("access control");
  {
    check("anonymous is refused", (await GET(req(null, OWNER_ID), { params: { id: OWNER_ID } })).status === 401);
    check("a stranger is refused", (await GET(req("good-stranger", OWNER_ID), { params: { id: OWNER_ID } })).status === 403);
    check("an unknown order is not found", (await GET(req("good-member", "missing"), { params: { id: "missing" } })).status === 404);
  }

  console.log("order state gating");
  {
    state.orders[STRANGER_ID] = order({ id: STRANGER_ID, status: "pending" });
    check("an unpaid digital order grants nothing", (await GET(req("good-member", STRANGER_ID), { params: { id: STRANGER_ID } })).status === 409);
    state.orders["phys"] = order({ id: "phys", is_digital: false });
    check("a physical order has no download", (await GET(req("good-member", "phys"), { params: { id: "phys" } })).status === 409);
    delete state.orders["phys"];
  }

  console.log("with an asset configured");
  {
    delivery.DIGITAL_ASSETS["codex-digital"] = { path: "codex-vol1-digital.pdf", filename: "Codex-Vol1.pdf" };
    state.fulfilWrites = 0;
    const r = await GET(req("good-member", OWNER_ID), { params: { id: OWNER_ID } });
    const body = await r.json();
    check("the buyer receives a signed url", r.status === 200 && !!body.url, "status " + r.status);
    check("the link is short-lived", body.expiresIn === delivery.DOWNLOAD_TTL_SECONDS);
    check("the filename is named", body.filename === "Codex-Vol1.pdf");
    check("the order becomes fulfilled only now", state.orders[OWNER_ID].status === "fulfilled", state.orders[OWNER_ID].status);

    const again = await GET(req("good-member", OWNER_ID), { params: { id: OWNER_ID } });
    check("a second download still works", again.status === 200);
    check("and does not re-write the status", state.fulfilWrites === 1, String(state.fulfilWrites));
  }

  console.log("storage failure");
  {
    state.orders[STRANGER_ID] = order({ id: STRANGER_ID, customer_email: "owner@example.com", status: "paid" });
    state.signFails = true;
    const r = await GET(req("good-member", STRANGER_ID), { params: { id: STRANGER_ID } });
    check("a signing failure is a 502, not a silent success", r.status === 502, "status " + r.status);
    check("and the order is not marked fulfilled", state.orders[STRANGER_ID].status === "paid", state.orders[STRANGER_ID].status);
    state.signFails = false;
  }

  srv.close();
  console.log(`\n${failures.length ? "FAILURES" : "ALL PASS"} — ${passed} passed, ${failures.length} failed`);
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
})().catch((e) => { console.error("harness crashed:", e); process.exit(1); });
