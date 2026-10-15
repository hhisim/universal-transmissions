/* Batch 25 — compose the three staged-demo requests through the REAL website POST handlers.
   Writes the exact backend payloads to website-composed-requests-b25.json. */
const path = require("path");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs")).registerTsModules({ root: ROOT });
/* The resolver now reaches the Journal and Artwork records, so their markdown sources are
   read as themselves: a stub would compose a message that no longer contains the record. */
for (const e of [".md", ".mdx"]) require.extensions[e] = (m) => { m.exports = fs.readFileSync(m.filename, "utf8"); };
for (const e of [".css", ".scss", ".svg", ".png", ".jpg", ".webp"]) require.extensions[e] = (m) => { m.exports = ""; };

let capped = [];
globalThis.fetch = async (u, i) => {
  capped.push(i && i.body ? String(i.body) : "");
  return new Response(JSON.stringify({ response: "M", retrieval_status: "ok" }), { status: 200, headers: { "Content-Type": "application/json" } });
};
const call = async (mod, body) => {
  capped = [];
  await require(path.join(ROOT, mod.replace("./", ""))).POST(new Request("https://ut.test/x", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
  return capped.length ? JSON.parse(capped[capped.length - 1]) : {};
};
const H = (t) => { const o = []; for (let i = 0; i < t.length; i++) o.push({ role: i % 2 ? "assistant" : "user", content: t[i] }); return o; };

const CASES = {
  "1-resolved-record-followup": {
    route: "./src/app/api/oracle/route.ts",
    body: { message: "What is its colour?", history: H(["Follow Aleph through its element.", "Aleph carries Air, Blue, White and Grey at 741 Hz."]) },
  },
  "2-copper-ambiguity-metal-clarified": {
    route: "./src/app/api/oracle/route.ts",
    body: { message: "What is its colour?", history: H(["Tell me about copper in the archive.", "Which copper do you mean?", "The metal one.", "Copper, the metal."]) },
  },
  "3-aleph-zorblax-pronoun": {
    route: "./src/app/api/oracle/route.ts",
    body: { message: "What does it mean?", history: H(["Follow Aleph through its element, colour and frequency.", "Aleph carries Air, Blue White Grey, 741 Hz.", "Tell me about Zorblax.", "I have no record of Zorblax."]) },
  },
  /* A multi-word Journal title: from Batch 26 this names a RECORD (its own text travels),
     so the subject-section fixture below is a real archive page no registry carries. */
  "4-journal-title-pronoun-followup": {
    route: "./src/app/api/oracle/route.ts",
    body: { message: "What does it mean?", history: H(["Tell me about The Star and the Uncarved Block.", "That one carries no correspondence record here."]) },
  },
  /* A multi-word name the resolver does NOT carry: still the visitor's subject, carried
     complete. This is where the Batch 25 subject-section assertions now apply. */
  "5-unheld-multiword-subject": {
    route: "./src/app/api/oracle/route.ts",
    body: { message: "What does it mean?", history: H(["Tell me about Prismatic Transmissions.", "That is a gallery collection, not a record here."]) },
  },
};

(async () => {
  const out = {};
  for (const [label, c] of Object.entries(CASES)) {
    const sent = await call(c.route, c.body);
    out[label] = {
      route: c.route,
      request_body: c.body,
      backend_payload: sent,
      composed_message: sent.message || sent.question || "",
    };
    console.log(label, "-> http ok, composed", (sent.message || "").length, "chars, markers:",
      ["current subject", "Selected Correspondence record", "Earlier turns"].filter((m) => (sent.message || "").toLowerCase().includes(m.toLowerCase())).join(" | "));
    const q = (sent.message || "").match(/Current subject of this conversation:\s*"([^"]*)"/);
    if (q) console.log("      subject carried:", JSON.stringify(q[1]));
  }
  const dest = process.env.ORACLE_REQUESTS_OUT || path.join(ROOT, "..", "b27", "pkg", "website-composed-requests-b25.json");
  fs.writeFileSync(dest, JSON.stringify(out, null, 2));
  console.log("saved", dest);
})();
