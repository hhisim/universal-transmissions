#!/usr/bin/env node
/**
 * batch27-record-links.js
 *
 * FROM THE ORACLE INTO THE ARCHIVE — the records an answer opened, as destinations.
 *
 * An answer grounded on named records used to end there: the resolver knew WHICH records the
 * question named, the response reported their identities, and nothing in the interface offered
 * the visitor a way to them. This suite covers the layer that turns those identities into
 * links, the component that renders them, and the promise that each answer keeps its own.
 *
 * Deterministic and through the REAL exported POST handlers for both routes, so the payload is
 * the shipped one. The component is rendered from its own module with react-dom/server, so the
 * DOM asserted here is the DOM the Oracle produces — not a description of it.
 */
const path = require("path");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs")).registerTsModules({ root: ROOT });
for (const e of [".md", ".mdx"]) require.extensions[e] = (m) => { m.exports = fs.readFileSync(m.filename, "utf8"); };
for (const e of [".css", ".scss", ".svg", ".png", ".jpg", ".webp"]) require.extensions[e] = (m) => { m.exports = ""; };

const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

let pass = 0, fail = 0;
const failures = [];
const ok = (c, m) => { if (c) { pass += 1; console.log("    ok   " + m); } else { fail += 1; failures.push(m); console.log("    FAIL " + m); } };

let capped = [];
globalThis.fetch = async (u, i) => {
  capped.push(i && i.body ? String(i.body) : "");
  return new Response(JSON.stringify({ response: "M", retrieval_status: "ok" }), { status: 200, headers: { "Content-Type": "application/json" } });
};
const ROUTES = { oracle: "src/app/api/oracle/route.ts", codex: "src/app/api/codex-oracle/route.ts" };
const call = async (body, route = "oracle") => {
  capped = [];
  const r = await require(path.join(ROOT, ROUTES[route])).POST(
    new Request("https://ut.test/api/" + route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  );
  const json = await r.json().catch(() => ({}));
  return { http: r.status, json, links: json.recordLinks || null, ids: ((json.namedRecords || {}).ids) || [] };
};
const H = (t) => t.map((x, i) => ({ role: i % 2 ? "assistant" : "user", content: x }));

const { archiveHref } = require(path.join(ROOT, "src/lib/codex-archive.ts"));
const { recordLinksFor, linkForRecord, ORACLE_RETURN_PATH } = require(path.join(ROOT, "src/lib/record-links.ts"));
const { resolveNamedRecords } = require(path.join(ROOT, "src/lib/named-record-resolver.ts"));
const { archiveRecordsByTitle } = require(path.join(ROOT, "src/lib/record-evidence.ts"));
const { serializeConversation, restoreConversation, appendAnswer } = require(path.join(ROOT, "src/lib/oracle-conversation-state.ts"));
const RecordLinks = require(path.join(ROOT, "src/components/oracle/RecordLinks.tsx")).default;

const STAR = "The Star and the Uncarved Block";
const STAR_ID = "journal:the-star-and-the-uncarved-block";
const STAR_HREF = "/journal/the-star-and-the-uncarved-block";
const TL = "Translinguistic Equation";
const TL_ID = "artwork:translinguistic-equation";
const TL_HREF = "/gallery/translinguistic-equation";
const TANTRA = "Toroidal Tantra";
const render = (set) => renderToStaticMarkup(React.createElement(RecordLinks, { set }));

(async () => {
  console.log("  --- 0. the fixtures are the records' own ---");
  ok((archiveRecordsByTitle(STAR)[0] || {}).href === STAR_HREF, "0 the Journal title indexes to its canonical route");
  ok((archiveRecordsByTitle(TL)[0] || {}).href === TL_HREF, "0 the artwork title indexes to its canonical route");
  ok(fs.existsSync(path.join(ROOT, "src/app/journal/[slug]/page.tsx")), "0 the Journal destination is a real route");
  ok(fs.existsSync(path.join(ROOT, "src/app/gallery/[slug]/page.tsx")), "0 the gallery destination is a real route");
  ok(fs.existsSync(path.join(ROOT, "src/app/codex/archive/page.tsx")), "0 the Codex Archive destination is a real route");

  console.log("\n  --- 1. an identity becomes the place that record lives ---");
  for (const [route, label] of [["oracle", "/api/oracle"], ["codex", "/api/codex-oracle"]]) {
    const j = await call({ message: `Tell me about ${STAR}.`, pack: "codex", mode: "oracle" }, route);
    ok(j.http === 200, `1 [${label}] answers 200`);
    const one = j.links && j.links.resolved[0];
    ok(one && one.id === STAR_ID, `1 [${label}] the resolved identity is carried for mapping`);
    ok(one && one.title === STAR, `1 [${label}] the link carries the record's own title`);
    ok(one && one.kind === "Journal", `1 [${label}] ...and its kind`);
    ok(one && one.href === STAR_HREF, `1 [${label}] ...and its canonical article`);
    ok(one && !one.system, `1 [${label}] a Journal record claims no correspondence system`);

    const a = await call({ message: `Tell me about ${TL}.`, pack: "codex", mode: "oracle" }, route);
    const art = a.links && a.links.resolved[0];
    ok(art && art.kind === "Artwork" && art.href === TL_HREF, `1 [${label}] an artwork links to its gallery page`);

    const c = await call({ message: "What does the heart correspond to?", pack: "codex", mode: "oracle" }, route);
    const corr = c.links && c.links.resolved[0];
    ok(corr && corr.kind === "Correspondence", `1 [${label}] a correspondence record is offered as Correspondence`);
    ok(corr && corr.href === archiveHref(corr.id, ORACLE_RETURN_PATH),
      `1 [${label}] ...at its own record in the released Codex Archive`);
    ok(corr && corr.href.startsWith("/codex/archive?entry="), `1 [${label}] ...as an archive entry, not a name`);
    ok(corr && corr.href.includes(encodeURIComponent(ORACLE_RETURN_PATH)),
      `1 [${label}] ...carrying the way back to the conversation`);
    ok(corr && corr.system && corr.system === corr.system.toUpperCase(), `1 [${label}] ...with its system, unrendered as a raw key`);
  }

  console.log("\n  --- 2. mention order is the visitor's, not the passes' ---");
  const ORDER = `Compare Aleph with ${TL} and ${STAR}.`;
  for (const [route, label] of [["oracle", "/api/oracle"], ["codex", "/api/codex-oracle"]]) {
    const j = await call({ message: ORDER, pack: "codex", mode: "oracle" }, route);
    const links = (j.links && j.links.resolved) || [];
    ok(links.length === 2, `2 [${label}] two records are offered (got ${links.length})`);
    ok(links[0] && links[0].kind === "Correspondence", `2 [${label}] first is the earliest mention`);
    ok(links[1] && links[1].id === TL_ID, `2 [${label}] second is the artwork the visitor named next`);
    ok(JSON.stringify(links.map((l) => l.id)) === JSON.stringify(j.ids),
      `2 [${label}] the links follow the resolver's own identity order exactly`);
  }

  console.log("\n  --- 3. an ambiguous title is offered as alternatives ---");
  const amb = await call({ message: `Tell me about ${TANTRA}.`, pack: "codex", mode: "oracle" });
  ok(amb.links && amb.links.resolved.length === 0, "3 nothing is resolved while the title is shared");
  const group = amb.links && amb.links.ambiguous[0];
  ok(group && group.options.length === 2, "3 both records are offered");
  const kinds = (group ? group.options.map((o) => o.kind) : []).sort().join("|");
  ok(kinds === "Artwork|Journal", "3 the alternatives are distinguishable by kind");
  ok(group && new Set(group.options.map((o) => o.href)).size === 2, "3 each alternative has its own destination");

  console.log("\n  --- 4. an unknown subject acquires no card ---");
  for (const [route, label] of [["oracle", "/api/oracle"], ["codex", "/api/codex-oracle"]]) {
    const j = await call({ message: "Tell me about the Prismatic Transmissions.", pack: "codex", mode: "oracle" }, route);
    ok(j.links === null, `4 [${label}] a subject no registry carries offers no link`);
    ok(j.ids.length === 0, `4 [${label}] ...and resolves no identity`);
  }

  console.log("\n  --- 5. an explicit selection stays authoritative ---");
  const unresolved = await call({ message: "What does it mean?", pack: "codex", mode: "oracle",
    entityId: "corr-v1:NOT_A_SYSTEM::Not A Record", entityType: "correspondence" });
  ok(unresolved.links === null, "5 an unresolved explicit identifier offers no substitute record");

  console.log("\n  --- 6. the component renders what it was given ---");
  const jr = await call({ message: `Tell me about ${STAR}.`, pack: "codex", mode: "oracle" });
  const html = render(jr.links);
  ok(html.includes(`href="${STAR_HREF}"`), "6 the record's canonical destination is the href");
  ok(html.includes(STAR), "6 the record's own title is the link text");
  ok(html.includes("Journal"), "6 its kind is shown");
  ok(html.includes("<section") && html.includes('aria-label="Records this answer opened"'),
    "6 the set is a named landmark, not a bare list");
  ok(!/corr-v1:|journal:|artwork:|gallery:/.test(html), "6 no raw identifier reaches the page");
  ok(!/confidence|score|disclaimer/i.test(html), "6 no confidence, score or disclaimer");
  ok(!/<script|onclick=|javascript:/i.test(html), "6 no script and no inline handler");

  const ambHtml = render(amb.links);
  ok(ambHtml.includes("/journal/toroidal-tantra") && ambHtml.includes("/gallery/torroidal-tantra"),
    "6 both alternatives are real links in the ambiguity");
  ok((ambHtml.match(/<a /g) || []).length === 2, "6 ...and there are exactly two of them");
  ok(!/aria-current|aria-selected|data-selected|is-selected/i.test(ambHtml),
    "6 neither alternative is marked as chosen before the visitor chooses");
  ok(/More than one record answers to/.test(ambHtml) && /role="group"/.test(ambHtml),
    "6 the group says why it is asking and is labelled as a group");
  ok(render(null) === "" && render({ resolved: [], ambiguous: [] }) === "",
    "6 nothing to offer renders nothing at all");

  console.log("\n  --- 7. every answer keeps its own records ---");
  const turnOne = await call({ message: `Tell me about ${STAR}.`, pack: "codex", mode: "oracle" });
  const turnTwo = await call({ message: `Now tell me about ${TL}.`, pack: "codex", mode: "oracle",
    history: H([`Tell me about ${STAR}.`, "A record was opened."]) });
  /* Null-safe: a broken seam must REPORT, not throw. */
  const firstHref = (m) => (m && m.records && m.records.resolved && m.records.resolved[0] && m.records.resolved[0].href) || "(none)";
  let convo = appendAnswer([{ role: "user", text: `Tell me about ${STAR}.` }],
    { role: "oracle", text: "…", records: turnOne.links });
  convo = appendAnswer(convo, { role: "user", text: `Now tell me about ${TL}.` });
  convo = appendAnswer(convo, { role: "oracle", text: "…", records: turnTwo.links });
  ok(firstHref(convo[1]) === STAR_HREF, `7 the first answer holds its own record (got ${firstHref(convo[1])})`);
  ok(firstHref(convo[3]) === TL_HREF, `7 the later answer holds its own (got ${firstHref(convo[3])})`);
  ok(firstHref(convo[1]) !== firstHref(convo[3]), "7 the subject change did not rewrite the earlier answer");
  const htmlTwo = render(convo[3].records);
  ok(htmlTwo.includes(TL_HREF) && !htmlTwo.includes(STAR_HREF), "7 a later answer shows its own record alone");

  const snapshot = JSON.stringify(convo[1]);
  const grown = appendAnswer(convo, { role: "oracle", text: "…", records: turnOne.links });
  ok(JSON.stringify(convo[1]) === snapshot && firstHref(grown[1]) === STAR_HREF,
    "7 appending never rewrites an earlier answer in place");

  const round = restoreConversation(serializeConversation(convo));
  ok(round.length === 4, "7 the conversation survives the round trip whole");
  ok(firstHref(round[1]) === STAR_HREF, `7 ...and the first answer keeps ITS OWN record, not the later one (got ${firstHref(round[1])})`);
  ok(firstHref(round[3]) === TL_HREF, `7 ...while the later answer keeps its own (got ${firstHref(round[3])})`);
  ok(render(round[1] && round[1].records).includes(STAR_HREF), "7 the restored first answer still renders its own link");

  /* The return journey must not resurrect a record by position: drop the second answer and the
     first must be untouched. */
  const trimmed = restoreConversation(serializeConversation(convo.slice(0, 2)));
  ok(firstHref(trimmed[1]) === STAR_HREF, "7 removing later turns does not reassign earlier links");

  console.log("\n  --- 8. the browser is not sent the corpus ---");
  const stateSrc = fs.readFileSync(path.join(ROOT, "src/lib/oracle-conversation-state.ts"), "utf8");
  const typeSrc = fs.readFileSync(path.join(ROOT, "src/lib/record-link-types.ts"), "utf8");
  const compSrc = fs.readFileSync(path.join(ROOT, "src/components/oracle/RecordLinks.tsx"), "utf8");
  ok(!/^import/m.test(typeSrc), "8 the shared shape module imports nothing");
  ok(!/named-record-resolver|record-evidence|data\/artworks|data\/blog-posts/.test(compSrc),
    "8 the component imports no registry, resolver or corpus");
  ok(!/named-record-resolver|record-evidence|data\/artworks|data\/blog-posts/.test(stateSrc),
    "8 the conversation store pulls in no corpus either");
  const clientSrc = fs.readFileSync(path.join(ROOT, "src/app/oracle/page-client.tsx"), "utf8");
  ok(/records: \(data\.recordLinks as RecordLinkSet \| null\) \|\| undefined,/.test(clientSrc),
    "8 the client takes records from THIS response");
  ok(/\{msg\.records \? <RecordLinks set=\{msg\.records\} \/> : null\}/.test(clientSrc),
    "8 ...and renders them from the message itself, never from shared state");
  ok(/readStoredConversation\(\)/.test(clientSrc) && /writeStoredConversation\(msgs\)/.test(clientSrc),
    "8 the conversation is restored and kept for the tab's session");
  ok(/setMsgs\(\(p\) => appendAnswer\(p, bubble\)\)/.test(clientSrc),
    "8 the client appends through the seam that gives each answer its own records");

  console.log("\n  assertions passed: " + pass + "   assertions failed: " + fail);
  for (const m of failures) console.log("   - " + m);
  process.exit(fail ? 1 : 0);
})();
