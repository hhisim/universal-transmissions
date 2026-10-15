/* Batch 25 — request-level regressions through the REAL exported POST handlers.
   Inspects the composed retrieval query and the provider messages. */
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs")).registerTsModules({ root: ROOT });
const MIN = "---\ntitle: s\ndate: 2026-01-01\n---\n\nx\n";
for (const e of [".md", ".mdx"]) require.extensions[e] = (m) => { m.exports = MIN; };
for (const e of [".css", ".scss", ".svg", ".png", ".jpg", ".webp"]) require.extensions[e] = (m) => { m.exports = ""; };

let pass = 0, fail = 0, capped = [];
const ok = (c, m) => { c ? (pass++, console.log("    ok   " + m)) : (fail++, console.log("    FAIL " + m)); };
globalThis.fetch = async (u, i) => {
  capped.push(i && i.body ? String(i.body) : "");
  return new Response(JSON.stringify({ response: "M", retrieval_status: "ok" }), { status: 200, headers: { "Content-Type": "application/json" } });
};
const call = async (mod, body) => {
  capped = [];
  const r = await require(path.join(ROOT, mod.replace("./", ""))).POST(new Request("https://ut.test/x", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
  const sent = capped.length ? JSON.parse(capped[capped.length - 1]) : {};
  return { http: r.status, msg: sent.message || sent.question || "", raw: capped[capped.length - 1] || "" };
};
const H = (t) => { const o = []; for (let i = 0; i < t.length; i++) o.push({ role: i % 2 ? "assistant" : "user", content: t[i] }); return o; };
const MARK = "Current subject of this conversation:";

(async () => {
  console.log("  --- 1. resolved follow-up retains the record ---");
  {
    const r = await call("./src/app/api/oracle/route.ts", { message: "What is its colour?", history: H(["Follow Aleph through its element.", "Aleph carries Air, Blue, White and Grey at 741 Hz."]) });
    ok(r.http === 200, "1 oracle returns 200");
    ok(/corr-v1:LETTERS_HEBREW::Aleph/.test(r.msg), "1 the carried Aleph record is transmitted");
    ok(/Aleph/.test(r.msg), "1 ...with its name present for the model");
  }

  console.log("  --- 2. clarified Copper follow-up ---");
  {
    const r = await call("./src/app/api/oracle/route.ts", { message: "What is its colour?", history: H(["Tell me about copper in the archive.", "Which copper do you mean?", "The metal one.", "Copper, the metal."]) });
    ok(r.http === 200, "2 oracle returns 200");
    ok(/corr-v1:METALS::Copper/.test(r.msg), "2 METALS::Copper is carried, not COLORS::Copper");
    ok(!/corr-v1:COLORS::Copper/.test(r.msg), "2 ...and the colour record is not substituted");
  }

  console.log("  --- 3. Zorblax -> pronoun ---");
  {
    const r = await call("./src/app/api/oracle/route.ts", { message: "What does it mean?", history: H(["Follow Aleph through its element, colour and frequency.", "Aleph carries Air, Blue White Grey, 741 Hz.", "Tell me about Zorblax.", "I have no record of Zorblax."]) });
    ok(r.http === 200, "3 oracle returns 200");
    ok(r.msg.includes(MARK) && /"Zorblax"/.test(r.msg), "3 Zorblax is transmitted as the current subject");
    ok(!/corr-v1:/.test(r.msg), "3 ...with NO invented archive record");
    const subj = r.msg.slice(r.msg.indexOf(MARK), r.msg.indexOf(MARK) + 400);
    ok(!/Aleph/.test(subj), "3 ...and Aleph is not revived in the subject section");
  }

  console.log("  --- 4. explicit-selection precedence ---");
  {
    const r = await call("./src/app/api/oracle/route.ts", { message: "What is its colour?", entityType: "correspondence_entry", entityId: "corr-v1:LETTERS_HEBREW::Aleph", history: H(["Tell me about Gimel.", "Gimel is the camel."]) });
    ok(r.http === 200, "4 oracle returns 200");
    ok(/corr-v1:LETTERS_HEBREW::Aleph/.test(r.msg), "4 the explicit selection wins over the conversational subject");
    ok(!r.msg.includes(MARK) || !/"Gimel"/.test(r.msg), "4 ...and no competing subject marker is pushed for Gimel");
  }

  console.log("  --- 5. fresh broad question after Zorblax: old subject NOT transmitted ---");
  {
    const r = await call("./src/app/api/oracle/route.ts", { message: "What is consciousness?", history: H(["Tell me about Zorblax.", "I have no record of Zorblax."]) });
    ok(r.http === 200, "5 oracle returns 200");
    ok(!r.msg.includes(MARK), "5 the previous subject is NOT transmitted as the current subject this turn");
    ok(!/"Zorblax"/.test(r.msg), "5 ...Zorblax does not appear as a carried subject");
  }

  console.log("  --- 6. the second route carries it too ---");
  {
    const r = await call("./src/app/api/codex-oracle/route.ts", { message: "What does it mean?", history: H(["Tell me about Zorblax.", "I have no record of Zorblax."]) });
    ok(r.http === 200, "6 codex-oracle returns 200");
    ok(r.raw.includes("Zorblax"), "6 /api/codex-oracle transmits the referent as well");
  }

  console.log("\n  assertions passed: " + pass);
  console.log("  assertions failed: " + fail);
  process.exit(fail ? 1 : 0);
})();
