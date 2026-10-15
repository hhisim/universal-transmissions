/* Batch 26 — compose requests through the REAL website POST handlers, from a spec.
 *
 * ORACLE_SPEC   JSON { label: { message, history? } }   (history = [{role, content}])
 * ORACLE_REQUESTS_OUT  where to write the composed requests
 *
 * Composition happens in the handler, not here, so what the preview sends is what the
 * deployed route composes. The markdown sources are read as themselves: the whole point is
 * that a named Journal or artwork record travels with its own text.
 */
const path = require("path");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs")).registerTsModules({ root: ROOT });
for (const e of [".md", ".mdx"]) require.extensions[e] = (m) => { m.exports = fs.readFileSync(m.filename, "utf8"); };
for (const e of [".css", ".scss", ".svg", ".png", ".jpg", ".webp"]) require.extensions[e] = (m) => { m.exports = ""; };

const SPEC = process.env.ORACLE_SPEC;
if (!SPEC) { console.error("ORACLE_SPEC is required"); process.exit(2); }
const OUT = process.env.ORACLE_REQUESTS_OUT;
if (!OUT) { console.error("ORACLE_REQUESTS_OUT is required"); process.exit(2); }
const spec = JSON.parse(fs.readFileSync(SPEC, "utf8"));

let capped = [];
globalThis.fetch = async (u, i) => {
  capped.push(i && i.body ? String(i.body) : "");
  return new Response(JSON.stringify({ response: "M", retrieval_status: "ok" }), { status: 200, headers: { "Content-Type": "application/json" } });
};
const call = async (mod, body) => {
  capped = [];
  const res = await require(path.join(ROOT, mod.replace("./", ""))).POST(new Request("https://ut.test/x", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
  const json = await res.json().catch(() => ({}));
  return { sent: capped.length ? JSON.parse(capped[capped.length - 1]) : {}, status: res.status, json };
};

(async () => {
  const out = {};
  for (const [label, turn] of Object.entries(spec)) {
    const body = { pack: "codex", mode: "oracle", message: turn.message };
    if (turn.history && turn.history.length) body.history = turn.history;
    const { sent, status, json } = await call("./src/app/api/oracle/route.ts", body);
    out[label] = {
      request_body: body,
      route_status: status,
      route_grounding_identity: (json && json.namedRecords) || null,
      backend_payload: sent,
      composed_message: sent.message || sent.question || "",
    };
    const q = (sent.message || "").match(/Current subject of this conversation:\s*"([^"]*)"/);
    const rec = (sent.message || "").match(/It is the record ([a-z]+:[a-z0-9-]+) at (\S+)\./);
    console.log(label, "-> composed", (sent.message || "").length, "chars",
      rec ? `| RECORD ${rec[1]} @ ${rec[2]}` : "", q ? `| SUBJECT ${JSON.stringify(q[1])}` : "",
      "| ids", JSON.stringify(((json || {}).namedRecords || {}).ids || []));
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log("saved", OUT);
})();
