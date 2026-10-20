const path = require("path");
const ROOT = "/root/ut-repo";
require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs")).registerTsModules({ root: ROOT });
// Next compiles .md imports to a string (raw loader). node has no such extension, so mirror it here.
require.extensions[".md"] = (mod, filename) => {
  mod.exports = require("fs").readFileSync(filename, "utf8");
};
const { blogPosts, getAllTags } = require(path.join(ROOT, "src/data/blog-posts.ts"));

console.log("posts:", blogPosts.length);
const years = {};
for (const p of blogPosts) {
  const y = String(p.publishedAt).slice(0, 4);
  years[y] = (years[y] || 0) + 1;
}
console.log("years:", JSON.stringify(years));
console.log("category voa(tradition):", blogPosts.filter(p => p.tradition).length,
            "| personal:", blogPosts.filter(p => !p.tradition).length);
const tags = getAllTags();
console.log("distinct tags:", tags.length);
const tagCounts = {};
for (const p of blogPosts) for (const t of (p.tags || [])) tagCounts[t] = (tagCounts[t] || 0) + 1;
const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
console.log("top 18 tags:", sorted.slice(0, 18).map(([t, c]) => `${t}(${c})`).join(", "));
console.log("tags used once:", sorted.filter(([, c]) => c === 1).length);
// alias-looking pairs: same edit distance / plural
const norm = t => t.toLowerCase().replace(/[^a-z0-9]/g, "");
const groups = {};
for (const [t] of sorted) {
  const k = norm(t).replace(/s$/, "");
  (groups[k] = groups[k] || []).push(t);
}
const aliases = Object.values(groups).filter(g => g.length > 1);
console.log("alias-shaped groups:", JSON.stringify(aliases));
// artwork / research references present on posts?
const keys = new Set();
for (const p of blogPosts) for (const k of Object.keys(p)) keys.add(k);
console.log("post fields:", [...keys].join(", "));
console.log("with heroImage:", blogPosts.filter(p => p.heroImage).length);
console.log("missing excerpt:", blogPosts.filter(p => !p.excerpt || !p.excerpt.trim()).length);
console.log("missing author:", blogPosts.filter(p => !p.author).length);
const authors = [...new Set(blogPosts.map(p => p.author))];
console.log("authors:", JSON.stringify(authors));
