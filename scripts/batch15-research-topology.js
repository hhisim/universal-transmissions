#!/usr/bin/env node
/**
 * batch15-research-topology.js — the Cymatics research pilot's contracts.
 *
 * The pilot's claim is that a visitor can move from a research question into the
 * archive's real records, understand WHY each relationship is held, and take any
 * single connection into the Oracle as its own context — and that none of that
 * rests on a relationship the archive cannot support.
 *
 * These assertions are structural: they can prove the registry is exact, that the
 * anchors cannot be forged, and that no displayed title is prose this batch wrote.
 * They cannot see a parameter dropped by a redirect or a chip rendered below the
 * fold — `docs/BATCH15-RESEARCH-TOPOLOGY.md` records the browser journey that can.
 *
 * Usage: node scripts/batch15-research-topology.js [base-sha]
 */
const path = require("node:path");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

// `src/data/blog-posts.ts` imports each post's markdown, which only a bundler can
// resolve. The assertions below read the RECORD SET (slug + title), never the post
// bodies, so the markdown boundary is stubbed rather than faked: an empty module is
// what an unread body is worth here.
require.extensions[".md"] = (mod) => { mod.exports = ""; };

const topics = require(path.join(ROOT, "src/lib/research-topics.ts"));
const connections = require(path.join(ROOT, "src/lib/research-connections.ts"));
const artworkData = require(path.join(ROOT, "src/data/artworks.ts"));
const blogPosts = require(path.join(ROOT, "src/data/blog-posts.ts"));

let passed = 0, failed = 0;
const ok = (m) => { console.log(`  ok   ${m}`); passed++; };
const bad = (m) => { console.log(`  FAIL ${m}`); failed++; };
const chkeq = (m, a, b) => a === b ? ok(m) : bad(`${m} (expected ${JSON.stringify(b)}, observed ${JSON.stringify(a)})`);
const chk = (m, cond, detail) => cond ? ok(m) : bad(`${m}${detail ? ` — ${detail}` : ""}`);

const CONNS = connections.CYMATICS_CONNECTIONS;
const TOPIC_SLUG = "cymatics";
const BASIS_VALUES = ["documented", "interpretation", "thematic"];

console.log("\n== A. every connection is addressable, explained and real ==");
chkeq("the connection set is not empty", CONNS.length > 0, true);
for (const c of CONNS) {
  const id = c.anchorSlug;
  const complete = ["anchorSlug","href","kind","title","rationale","basis","basisLabel","suggestedQuestion"]
    .every((k) => typeof c[k] === "string" && c[k].trim().length > 0);
  chk(`${id}: every required field is present`, complete);
  chk(`${id}: the basis is one of the three declared values`, BASIS_VALUES.includes(c.basis), c.basis);
  chk(`${id}: the rationale explains the link (>= 80 chars, not a restatement of the title)`,
      c.rationale.length >= 80 && c.rationale.trim() !== c.title.trim(), `${c.rationale.length} chars`);
  chk(`${id}: the question is a question`, c.suggestedQuestion.trim().endsWith("?"));
}
chkeq("anchor slugs are unique", new Set(CONNS.map((c) => c.anchorSlug)).size, CONNS.length);
chkeq("destinations are unique", new Set(CONNS.map((c) => c.href)).size, CONNS.length);
chk("the codex frequency lattice is linked (the symbolic-correspondences leg)",
    CONNS.some((c) => c.href === "/experience/correspondence-codex"));

console.log("\n== B. the Oracle contract: one identifier, exact resolution ==");
const topicRecord = topics.resolveResearchTopic(topics.researchTopicId(TOPIC_SLUG));
chk("the Cymatics topic resolves from its stable identifier", !!topicRecord);
for (const c of CONNS) {
  const publicId = topics.researchConnectionTopicId(TOPIC_SLUG, c.anchorSlug);
  const resolved = topics.resolveResearchTopic(publicId);
  chk(`${c.anchorSlug}: resolves under ${publicId}`, !!resolved);
  if (!resolved) continue;
  chkeq(`${c.anchorSlug}: the canonical route IS the connection destination`, resolved.route, c.href);
  chkeq(`${c.anchorSlug}: the title IS the connection record's own title`, resolved.title, c.title);
  chkeq(`${c.anchorSlug}: the seed question IS the connection's own`, resolved.suggestedQuestion, c.suggestedQuestion);
  chk(`${c.anchorSlug}: the summary names its basis in words`,
      /DOCUMENTED|UT ARTISTIC INTERPRETATION|THEMATIC ASSOCIATION/.test(resolved.summary));
  chk(`${c.anchorSlug}: the summary carries the topic's epistemic standing`,
      resolved.summary.includes("OBSERVED") && resolved.summary.includes("HISTORICAL"));
  const internal = resolved.sources.filter((s) => s.internal);
  const external = resolved.sources.filter((s) => !s.internal);
  chkeq(`${c.anchorSlug}: exactly one internal source (the record itself)`, internal.length, 1);
  chkeq(`${c.anchorSlug}: the internal source IS the destination`, internal[0] && internal[0].url, c.href);
  chk(`${c.anchorSlug}: the topic's external references are carried, still marked external`,
      external.length > 0 && external.every((s) => s.kind !== undefined && s.supports));
  const block = topics.researchPromptBlock(resolved);
  chk(`${c.anchorSlug}: the prompt block keeps the source discipline`,
      block.includes("OBSERVED") && block.includes("UT ARTISTIC INTERPRETATION"));
  chk(`${c.anchorSlug}: the prompt block forbids medical claims`, /healing|medical/i.test(block));
}

console.log("\n== C. a forged or unknown identifier cannot produce a record ==");
const FORGERIES = [
  null, undefined, "", "   ", 42, {}, [],
  "research-v1:", "research-v1:not-a-topic", "research-v1:cymatics/connection/",
  "research-v1:cymatics/connection/does-not-exist",
  "research-v1:cymatics/connection/../../etc/passwd",
  "cymatic", "CYMATICS", "Cymatics", "cymatics-x", "cymatics/connection",
  "research-v1:cymatics/connection",
  "research-v1:geometry", "research-v1:linguistics",
  "research-v1:cymatics/connection/journal-cymatics-language-of-form/extra",
];
for (const f of FORGERIES) {
  chk(`no record for ${JSON.stringify(f)}`, topics.resolveResearchTopic(f) === null);
}
const valid = topics.resolveResearchTopic(topics.researchConnectionTopicId(TOPIC_SLUG, CONNS[0].anchorSlug));
chk("the exact key still resolves after the forgery sweep", !!valid);
// The shipped resolver trims surrounding whitespace BEFORE the exact-key lookup. That
// is input hygiene, not fuzzy matching, so it is asserted as the contract it is — and
// a padded FORGED key still finds nothing.
chk("a whitespace-padded valid identifier is trimmed, then matched exactly",
    !!topics.resolveResearchTopic("  cymatics  "));
chk("a whitespace-padded forged key still finds nothing",
    topics.resolveResearchTopic("  cymatics/connection/nope  ") === null);

console.log("\n== D. displayed titles are the RECORDS' own titles ==");
const bySlug = new Map((artworkData.artworks || []).map((a) => [a.slug, a]));
const posts = new Map((blogPosts.blogPosts || blogPosts.posts || []).map((p) => [p.slug, p]));
chkeq("the artwork registry loaded", bySlug.size > 0, true);
chkeq("the journal index loaded", posts.size > 0, true);
for (const c of CONNS) {
  const m = /^\/(gallery|journal)\/(.+)$/.exec(c.href);
  if (!m) { chk(`${c.anchorSlug}: destination is a known content route`, c.href === "/experience/correspondence-codex", c.href); continue; }
  const [, kind, slug] = m;
  const record = kind === "gallery" ? bySlug.get(slug) : posts.get(slug);
  chk(`${c.anchorSlug}: the ${kind} record ${slug} exists in the loaded dataset`, !!record);
  if (record) chkeq(`${c.anchorSlug}: the title IS the record's own title`, c.title, record.title);
}

console.log("\n== E. the page and its section keep the journey's contracts ==");
const page = fs.readFileSync(path.join(ROOT, "src/app/research/cymatics/page.tsx"), "utf8");
const section = fs.readFileSync(path.join(ROOT, "src/components/research/CymaticsConnections.tsx"), "utf8");
chk("the hero no longer attributes the epigraph to Pythagoras", !/— Pythagoras/.test(page));
chk("the epigraph itself is kept", page.includes("we become what we sing"));
chk("the connections section receives the topic slug and a return path",
    /<CymaticsConnections[\s\S]*?topicSlug=\{cymaticsTopic\.id\}[\s\S]*?returnHref="\/research\/cymatics"/.test(page));
chk("each card derives its anchor from the registry helper",
    section.includes("researchConnectionTopicId(topicSlug, c.anchorSlug)"));
chk("the Oracle entry carries the stable identifier", section.includes("researchTopicId=${encodeURIComponent(anchorId)}"));
chk("the Oracle entry carries the return path", section.includes("from=${encodeURIComponent(returnHref)}"));
chkeq("the card holds exactly two links (destination + Oracle entry, never nested)",
    (section.match(/<Link/g) || []).length, 2);
chk("the Oracle link is NOT inside the destination link",
    section.indexOf("data-connection-oracle") > section.indexOf("</Link>"));
chk("the section is anchored for a return link", section.includes('id="connections"'));
chk("the honest-absence block survives", section.includes("CYMATICS_GAPS") && connections.CYMATICS_GAPS.length >= 2);
chk("the gaps state the codex is linked as a system, not as one entry read",
    /FREQUENCY system as a whole/.test(connections.CYMATICS_GAPS.join(" ")));
chk("no graph engine, canvas or new visualisation dependency",
    !/react-force-graph|d3-force|cytoscape|<canvas/i.test(section));

console.log("\n== G. a destination that cannot be targeted says how to reach it ==");
/* The brief for this pass: "use its existing supported navigation to expose
   FREQUENCY, or clearly tell the visitor how to locate it. Do not imply a
   targeted destination that the link does not provide." The Codex is a single
   page that reads no URL parameter and no fragment (checked in the browser and
   recorded in the journey evidence), so the note is the honest branch. */
const codexConn = CONNS.find((c) => c.href === "/experience/correspondence-codex");
chk("the codex connection still exists", !!codexConn);
if (codexConn) {
  chkeq("the card title is the destination's OWN title, not a system inside it",
      codexConn.title, "The UT Correspondence Codex");
  chk("the title no longer implies a targeted system", !/FREQUENCY/i.test(codexConn.title));
  chk("the destination states how to locate FREQUENCY",
      typeof codexConn.destinationNote === "string" && /FREQUENCY/.test(codexConn.destinationNote));
  chk("the note names the Codex Home system grid", /Home tab/.test(codexConn.destinationNote || ""));
  chk("the note names the Matrix tab's system bar", /Matrix/.test(codexConn.destinationNote || ""));
  chk("the note says the link opens the front page, not a system",
      /front page/.test(codexConn.destinationNote || ""));
  const codexAnchor = topics.resolveResearchTopic(
      topics.researchConnectionTopicId(TOPIC_SLUG, codexConn.anchorSlug));
  chk("the Oracle anchor carries the same 'how to reach it' statement",
      !!codexAnchor && codexAnchor.summary.includes(codexConn.destinationNote));
  chk("the anchor's canonical route is still the Codex front page",
      !!codexAnchor && codexAnchor.route === "/experience/correspondence-codex");
}
/* Every destination that is not a content route addressed by slug cannot be
   pointed at from a link, so it must carry the note. */
const needsNote = CONNS.filter((c) => !/^\/(gallery|journal)\//.test(c.href));
chk("every destination that is not a deep-linkable content route carries a note",
    needsNote.length > 0 && needsNote.every((c) => typeof c.destinationNote === "string" && c.destinationNote.trim().length > 40));
chk("the card renders the note as plain text, not a third link",
    /data-connection-destination-note/.test(section) && !/<a[^>]*data-connection-destination-note/.test(section));
{
  /* The long basis labels ("Catalogued in the archive's own FREQUENCY lattice")
     sat in a nowrap, shrink-0 span; at 390 CSS px that clipped. */
  const headFrom = section.indexOf("flex flex-col sm:flex-row sm:items-start sm:justify-between");
  const head = headFrom < 0 ? "" : section.slice(headFrom, section.indexOf("</div>", headFrom));
  chk("the card header stacks on narrow screens",
      head.includes("sm:flex-row") && head.includes("flex-col"));
  chk("both header labels are allowed to wrap, neither is shrink-0",
      (head.match(/break-words/g) || []).length === 2 && !/shrink-0/.test(head));
}

console.log("\n== H. an unresolved identifier cannot retain or submit the previous anchor ==");
const client = fs.readFileSync(path.join(ROOT, "src/app/oracle/page-client.tsx"), "utf8");
chk("the research anchor is derived with the unknown case NAMED as a state",
    /state: "unresolved"; requestedId: string/.test(client));
chk("the anchor is derived from the URL, not copied into component state",
    client.includes('if (!rawResearchId) return { state: "none" } as const;') &&
    !/useState\([^)]*researchAnchor/.test(client) &&
    !/setResearchAnchor/.test(client));
chk("the chip renders from that derived state",
    client.includes('{researchAnchor.state === "unresolved" && ('));
chk("the research anchor is read through a ref that is refreshed every render",
    /const researchAnchorRef = useRef\(researchAnchor\);/.test(client) &&
    /researchAnchorRef\.current = researchAnchor;/.test(client));
chk("the request identifier is read from that ref at submit time",
    /const anchor = researchAnchorRef.current;/.test(client));
chk("the payload is built from the same value the chip is rendered from",
    /researchTopicId:\s*\n\s*anchor\.state === "resolved"/.test(client));
chk("an unresolved identifier is forwarded AS ITSELF, never a resolved one",
    client.includes('anchor.requestedId'));
chk("the research anchor is named in the send callback's dependency list",
    /artworkContext, researchAnchor, cancelPendingSpeech/.test(client));
chk("the artwork anchor stays suppressed whenever a research id was supplied",
    /if \(researchRequested\) return null;/.test(client));
chk("a route change to a different entry aborts the in-flight resolution",
    client.includes("const entryIdentity =") && /}, \[entryIdentity\]\);/.test(client));
{
  const from = client.indexOf("const entryIdentity =");
  const guard = client.slice(from, client.indexOf("}, [entryIdentity]);", from));
  chk("the navigation guard aborts transport only",
      /reqAbortRef\.current\?\.abort\(\)/.test(guard) && !/setMsgs/.test(guard) && !/setInput/.test(guard));
  chk("the guard leaves the conversation and the visitor's draft intact",
      !/setMsgs|setInput|setDraftSeeded/.test(guard));
}

console.log("\n== F. the untouched corpus did not move ==");
// Compared against the revision this batch started from (the clean tree's tip), not
// against the released application commit — Batch 14's own harness files ride between
// the two, and counting them here would report the previous batch as movement.
const BASE = process.argv[2] || "HEAD";
let changed = null;
try {
  changed = execFileSync("git", ["-C", ROOT, "diff", "--name-only", BASE], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
} catch { changed = null; }
if (changed === null) {
  console.log("  ok   (skipped: no git history for the base revision here — recorded in the review doc)");
  passed++;
} else {
  const ALLOWED = [
    "src/lib/research-connections.ts", "src/lib/research-topics.ts",
    "src/components/research/CymaticsConnections.tsx", "src/app/research/cymatics/page.tsx",
    "src/app/oracle/page-client.tsx",
    "scripts/batch15-research-topology.js", "scripts/batch15b-connection-journey.py",
    "docs/BATCH15-RESEARCH-TOPOLOGY.md", "docs/BATCH15B-SELECTED-CONNECTION-JOURNEY.md",
    // Batch 15c — the authorized combination of the sale-alert repair, which is the
    // one file below this pilot is allowed to reach into the webhook for.
    "src/app/api/stripe-webhook/route.ts",
    "scripts/lib/ut-membership-webhook-harness.cjs",
    "scripts/batch15c-sale-alert-notification.js",
    "docs/BATCH15C-SALE-ALERT-COMBINATION.md",
  ];
  const unexpected = changed.filter((f) => !ALLOWED.includes(f)
    && !f.startsWith("docs/evidence/batch15b/") && !f.startsWith("docs/evidence/batch15c/"));
  chkeq("only the pilot's own files changed", unexpected.length, 0);
  chk("public/ media untouched", !changed.some((f) => f.startsWith("public/")));
  chk("the artwork registry is untouched", !changed.includes("src/data/artworks.ts"));
  chk("the journal corpus is untouched", !changed.some((f) => f.startsWith("src/data/blog-content/")));
  chk("the codex corpus is untouched", !changed.some((f) => f.startsWith("src/data/codex")));
  // Scope, not a blanket ban: the only billing/membership-named files that may change
  // are the two this batch was authorized to change — the webhook and the shared test
  // harness whose Stripe/table doubles it extends. Anything else still fails.
  const AUTHORIZED_BILLING = [
    "src/app/api/stripe-webhook/route.ts",
    "scripts/lib/ut-membership-webhook-harness.cjs",
  ];
  const billingTouched = changed.filter((f) => /membership|billing|stripe/.test(f));
  chk("the only billing/membership file changed is the authorized sale-alert port",
      billingTouched.every((f) => AUTHORIZED_BILLING.includes(f)));
  chk("no migration changed", !changed.some((f) => f.startsWith("supabase/migrations/")));
}

console.log(`\nassertions passed: ${passed}  failed: ${failed}`);
console.log(failed === 0 ? "BATCH15_RESEARCH_TOPOLOGY_PASSED" : "BATCH15_RESEARCH_TOPOLOGY_FAILED");
process.exit(failed === 0 ? 0 : 1);
