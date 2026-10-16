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
const {
  serializeConversation, restoreConversation, appendAnswer,
  serializeConversationState, restoreConversationState,
  seedFrom, sameSeed, isEmptySeed, decideRestore, resolveSelectedEntry, planMount,
  CONVERSATION_STATE_VERSION,
} = require(path.join(ROOT, "src/lib/oracle-conversation-state.ts"));
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
  ok(/readStoredConversation\(\)/.test(clientSrc) && /writeStoredConversation\(msgs, seedFrom\(/.test(clientSrc),
    "8 the conversation is restored and kept for the tab's session");
  ok(/setMsgs\(\(p\) => appendAnswer\(p, bubble\)\)/.test(clientSrc),
    "8 the client appends through the seam that gives each answer its own records");

  console.log("\n  --- 9. the mount decision: returning vs a genuinely new handoff ---");
  const seedA = seedFrom({ q: `Tell me about ${STAR}.` });
  const seedB = seedFrom({ q: `Tell me about ${TANTRA}.` });
  const seedArt = seedFrom({ q: `Tell me about ${TL}.`, artworkId: "translinguistic-equation" });
  ok(isEmptySeed(seedFrom({})), "9 a URL with no identifiers is an empty seed");
  ok(sameSeed(seedA, seedFrom({ q: `  Tell me about ${STAR}.  ` })), "9 seeds are compared normalised");

  const storedRaw = serializeConversationState({ msgs: convo, seed: seedA, selectedEntryId: "corr-v1:LETTERS_HEBREW::Aleph" });
  const back = restoreConversationState(storedRaw);
  ok(back && sameSeed(back.seed, seedA), "9 the handoff that opened the conversation is kept with it");
  ok(back && back.selectedEntryId === "corr-v1:LETTERS_HEBREW::Aleph", "9 ...and the selected entry, as a stable identifier");

  let dec = decideRestore(back && back.seed, seedA);
  ok(dec.restore === true && dec.clear === false, `9 RETURNING to the same ?q= URL restores (${dec.reason})`);
  dec = decideRestore(back && back.seed, seedFrom({}));
  ok(dec.restore === true && dec.clear === false, "9 a plain visit to /oracle restores the conversation");
  dec = decideRestore(back && back.seed, seedB);
  ok(dec.restore === false && dec.clear === true, "9 a DIFFERENT handoff clears and starts fresh");
  dec = decideRestore(back && back.seed, seedArt);
  ok(dec.restore === false && dec.clear === true, "9 ...including a different artwork handoff");
  dec = decideRestore(null, seedA);
  ok(dec.restore === false && dec.clear === false, "9 with nothing stored, nothing is restored or cleared");
  dec = decideRestore(back && back.seed, seedFrom({ q: seedA.q, artworkId: "x" }));
  ok(dec.restore === false && dec.clear === true, "9 a seed that differs in ANY identifier is a new handoff");

  const planReturn = planMount(back, seedA, "");
  ok(planReturn.msgs.length === back.msgs.length && planReturn.clear === false,
    "9 the plan restores the messages and clears nothing");
  ok(planReturn.selectionSource === "stored" && planReturn.selectedEntryId === "corr-v1:LETTERS_HEBREW::Aleph",
    "9 ...and restores the selection the conversation was left with");
  const planUrl = planMount(back, seedA, "corr-v1:METALS::Copper");
  ok(planUrl.selectionSource === "url" && planUrl.selectedEntryId === "corr-v1:METALS::Copper",
    "9 ...but an identifier in the URL wins over the stored one");
  const planNew = planMount(back, seedB, "");
  ok(planNew.msgs.length === 0 && planNew.clear === true && planNew.selectedEntryId === null,
    "9 a new handoff restores nothing and keeps no stale selection");
  const planUnknown = planMount(back, seedB, "corr-v1:NOPE::Nope");
  ok(planUnknown.selectedEntryId === "corr-v1:NOPE::Nope" && planUnknown.selectionSource === "url",
    "9 an UNKNOWN explicit identifier stays itself; no stored selection is substituted for it");
  const planReturnUnknown = planMount(back, seedA, "corr-v1:NOPE::Nope");
  ok(planReturnUnknown.selectedEntryId === "corr-v1:NOPE::Nope",
    "9 ...on a returning visit too");

  console.log("\n  --- 10. the restored selection, and what the next request carries ---");
  ok(resolveSelectedEntry("", "corr-v1:A::One").source === "stored", "10 the stored selection is used when the URL names none");
  ok(resolveSelectedEntry("corr-v1:B::Two", "corr-v1:A::One").selected === "corr-v1:B::Two", "10 the URL's identifier wins");
  ok(resolveSelectedEntry("corr-v1:B::Two", "corr-v1:A::One").source === "url", "10 ...and is reported as the URL's");
  ok(resolveSelectedEntry("", "").selected === null, "10 with neither, nothing is selected");
  ok(resolveSelectedEntry(null, null).selected === null, "10 ...and absent identifiers are handled the same way");

  console.log("\n  --- 11. the selected-entry evidence panel survives the journey ---");
  const EVIDENCE = {
    entityId: "corr-v1:LETTERS_HEBREW::Aleph", entityType: "correspondence", title: "Aleph",
    system: "LETTERS_HEBREW", sourceType: "correspondence",
    fields: [{ label: "Value", value: "1" }, { label: "Letter", value: "\u05d0" }],
    action: { label: "Inspect record", href: "/codex/archive?entry=corr-v1%3ALETTERS_HEBREW%3A%3AAleph" },
  };
  const withEvidence = appendAnswer([{ role: "user", text: "Aleph?" }],
    { role: "oracle", text: "answer", evidence: EVIDENCE, audioUrl: "blob:https://ut.test/1", ttsPending: true });
  const evRound = restoreConversation(serializeConversation(withEvidence));
  const ev = evRound[1] && evRound[1].evidence;
  ok(ev && ev.entityId === EVIDENCE.entityId && ev.title === "Aleph" && ev.system === "LETTERS_HEBREW",
    "11 the evidence panel's identity comes back");
  ok(ev && ev.fields.length === 2 && ev.fields[1].value === EVIDENCE.fields[1].value, "11 ...with its fields");
  ok(ev && ev.action && ev.action.href === EVIDENCE.action.href, "11 ...and its in-place inspector action");
  ok(ev && ev.sourceType === "correspondence", "11 ...and the source type the panel labels");
  const storedJson = serializeConversation(withEvidence) || "";
  ok(!/blob:|audioUrl|ttsPending/.test(storedJson),
    "11 audio object URLs and pending playback state stay OUT of storage");
  ok(evRound[1].text === "answer" && !("audioUrl" in evRound[1]), "11 ...and the restored message carries no audio field");

  const hostile = JSON.stringify({ v: CONVERSATION_STATE_VERSION, at: 1, seed: null, selectedEntryId: null,
    msgs: [{ role: "oracle", text: "x", evidence: { entityId: "e", title: "t",
      fields: [{ label: "a", value: "b" }], action: { label: "go", href: "javascript:alert(1)" } } }] });
  const hostileRead = restoreConversation(hostile)[0];
  ok(hostileRead && hostileRead.evidence && hostileRead.evidence.action === null,
    "11 a non-site action href is dropped rather than rendered");
  ok(restoreConversation(JSON.stringify({ v: 1, at: 1, msgs: [{ role: "oracle", text: "old" }] })).length === 0,
    "11 a previous version reads as nothing, never as a guess");
  ok(restoreConversationState(serializeConversationState({ msgs: [], seed: seedA })) === null,
    "11 an empty conversation keeps nothing at all");
  ok((back && back.msgs.length) === convo.length, "11 the state round trip keeps every message");

  console.log("\n  --- 12. the client performs that decision (wiring) ---");
  ok(/planMount\(readStoredConversation\(\), seed, entryAnchorId\)/.test(clientSrc), "12 the mount effect runs the plan");
  ok(/if \(plan\.clear\) clearStoredConversation\(\)/.test(clientSrc), "12 ...clearing only when the plan says so");
  ok(/if \(plan\.msgs\.length\)/.test(clientSrc), "12 ...restoring only when there is something to restore");
  ok(/writeStoredConversation\(msgs, seedFrom\(/.test(clientSrc), "12 the handoff and selection are kept with the conversation");
  ok(/restoredConversationRef/.test(clientSrc), "12 a restored conversation is not re-seeded from the entry draft");
  ok(!/if \(entryQuestion\) \{\s*$[\s\S]{0,80}clearStoredConversation/.test(clientSrc),
    "12 no unconditional clear on a non-empty ?q= remains in the client");

  console.log("\n  assertions passed: " + pass + "   assertions failed: " + fail);
  for (const m of failures) console.log("   - " + m);
  process.exit(fail ? 1 : 0);
})();
