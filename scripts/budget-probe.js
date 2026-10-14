#!/usr/bin/env node
/* budget-probe.js — where the grounding budget actually goes, per room.
 * Usage: node scripts/budget-probe.js
 */
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });
require.extensions[".md"] = (mod) => { mod.exports = ""; };

const topics = require(path.join(ROOT, "src/lib/research-topics.ts"));
const conv = require(path.join(ROOT, "src/lib/oracle-conversation.ts"));
const conn = require(path.join(ROOT, "src/lib/research-connections.ts"));
const LIMIT = conv.MAX_GRINDED_CHARS;
const QMAX = conv.MAX_QUESTION_CHARS;

console.log(`MAX_GRINDED_CHARS=${LIMIT}  MAX_QUESTION_CHARS=${QMAX}  block budget=${LIMIT - QMAX}`);
console.log("");
for (const slug of topics.researchTopicSlugs()) {
  const t = topics.resolveResearchTopic(topics.researchTopicId(slug));
  const room = topics.researchPromptBlock(t);
  const srcs = t.sources.reduce((n, s) => n + s.supports.length + s.label.length + 8, 0);
  const list = conn.CONNECTIONS_BY_TOPIC[slug] || [];
  console.log(`── ${slug}`);
  console.log(`   room block        ${String(room.length).padStart(6)}  (summary ${t.summary.length}, sources≈${srcs})  ${room.length + QMAX <= LIMIT ? "OK" : "OVER"}`);
  let worst = 0, worstId = "";
  for (const c of list) {
    const id = topics.researchConnectionTopicId(slug, c.anchorSlug);
    const b = topics.researchPromptBlock(topics.resolveResearchTopic(id));
    const total = b.length + QMAX;
    if (total > worst) { worst = total; worstId = c.anchorSlug; }
    console.log(`     ${c.anchorSlug.padEnd(46)} block ${String(b.length).padStart(6)}  total ${String(total).padStart(6)}  ${total <= LIMIT ? "OK" : "OVER by " + (total - LIMIT)}`);
  }
  console.log(`   worst: ${worstId} at ${worst} of ${LIMIT} (headroom ${LIMIT - worst})`);
  console.log("");
}
