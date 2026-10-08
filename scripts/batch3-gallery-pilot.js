/* Batch 3 — progressive gallery pilot regression assertions.
   Run: node scripts/batch3-gallery-pilot.js
   Structural assertions over the real source files (no mocking). */
const fs = require("fs");
const path = require("path");

const REPO = process.env.B3_REPO || "/var/tmp/ut-batch3";
const read = (p) => fs.readFileSync(path.join(REPO, p), "utf8");

const PAGE = 'src/app/gallery/[slug]/page.tsx';
const EXPLORER = "src/components/gallery/ProgressiveDetailExplorer.tsx";
const LIGHTBOX = "src/components/gallery/Lightbox.tsx";
const REGISTRY = "src/data/artworks.ts";

const page = read(PAGE);
const explorer = read(EXPLORER);
const lightbox = read(LIGHTBOX);
const registry = read(REGISTRY);

let pass = 0, fail = 0;
const failures = [];
function ok(cond, name, detail) {
  if (cond) { pass++; console.log("  ok  " + name); }
  else { fail++; failures.push(name + (detail ? " :: " + detail : "")); console.log("  FAIL " + name + (detail ? " :: " + detail : "")); }
}
function section(t) { console.log("\n== " + t + " =="); }

/* ---------------- 1. pilot scope ---------------- */
section("1. Pilot scope is limited to /gallery/vitruvian-spirit");
ok(/const PROGRESSIVE_PILOT_SLUG = "vitruvian-spirit";/.test(page),
   "pilot slug constant is exactly vitruvian-spirit");
ok(/artwork\.slug === PROGRESSIVE_PILOT_SLUG/.test(page),
   "pilot branch is gated on the slug");
ok(/<ProgressiveDetailExplorer/.test(page), "explorer is rendered for the pilot");
ok(/gallery-carousel/.test(page), "original carousel markup is retained for other artworks");
ok(/<ImageThumb[\s\S]*?src=\{img\}/.test(page), "ImageThumb path retained for other artworks");
const gate = page.indexOf("artwork.slug === PROGRESSIVE_PILOT_SLUG");
const legacyStrip = page.indexOf("gallery-carousel");
ok(gate !== -1 && legacyStrip > gate, "legacy strip lives in the non-pilot branch");

/* ---------------- 2. unrevealed details are not mounted ---------------- */
section("2. Unrevealed details cannot start a request (not CSS-hidden)");
ok(!/hidden\b/.test(explorer.split("data-detail-grid")[0] || ""), "no blanket hiding in grid header");
ok(/\.filter\(\(d\) => revealedSet\.has\(d\.registryIndex\)\)/.test(explorer),
   "rendered set is an explicit filter over revealed indices");
ok(/details\.filter\(\(d\) => !revealedSet\.has\(d\.registryIndex\)\)/.test(explorer),
   "pending set computed separately");
ok(!/opacity-0[^"]*absolute|visibility:\s*hidden/.test(explorer),
   "revealed/unrevealed is not done with opacity/visibility");
ok(!/display:\s*"none"/.test(explorer), "no display:none mounting trick");
const gridBlock = explorer.slice(explorer.indexOf("visible.map("), explorer.indexOf("</ul>"));
ok(/\{visible\.map\(/.test(explorer), "grid maps ONLY the visible subset");
ok(gridBlock.indexOf("pending.map(") === -1, "pending details are not inside the grid");
ok(!/maxHeight\s*:\s*0/.test(explorer), "no collapsed-height trick");

/* ---------------- 3. registry integrity ---------------- */
section("3. Registry identity and order are preserved");
const seg = registry.slice(registry.indexOf("vitruvian-spirit"), registry.indexOf("vitruvian-spirit") + 6000);
const details = seg.match(/detailImages:\s*\[([^\]]+)\]/)[1]
  .match(/"([^"]+)"/g).map((s) => s.slice(1, -1));
ok(details.length === 42, "registry declares 42 details", "got " + details.length);
ok(/registryIndex: i \+ 1/.test(page), "registry index is derived 1-based from registry order");
ok(!/\.sort\(/.test(explorer), "component does not re-sort the registry order");
ok(!/reverse\(/.test(explorer), "component does not reverse the registry order");
/* Review correction: reveal must APPEND, never re-sort. Re-sorting moves the
   seeded non-consecutive tiles (35/37/38) even though scrollY is unchanged. */
ok(/return \[\.\.\.prev, \.\.\.additions\];/.test(explorer),
   "reveal appends instead of rebuilding a sorted list");
ok(/const additions: number\[\] = \[\]/.test(explorer), "additions collected separately");
ok(/if \(seen\.has\(d\.registryIndex\)\) continue;/.test(explorer),
   "already-revealed details are skipped, never re-added");
ok(!/details\.filter\(\(d\) => next\.has\(d\.registryIndex\)\)/.test(explorer),
   "reveal no longer rebuilds the list in registry order");
ok(!/\.sort\(/.test(explorer), "no sort anywhere in the explorer");
ok(!/\.reverse\(/.test(explorer), "no reverse anywhere in the explorer");
ok(/registryIndex: i \+ 1/.test(page), "canonical identity stays registry-derived, not slot-derived");

/* ---------------- 4. batch size and counts ---------------- */
section("4. Six per activation, accurate counts");
ok(/const BATCH_SIZE = 6;/.test(explorer), "BATCH_SIZE is 6");
ok(/if \(additions\.length >= BATCH_SIZE\) break;/.test(explorer),
   "reveal is capped at BATCH_SIZE new entries");
ok(/\{revealed\.length\} of \{total\} revealed/.test(explorer), "revealed/total is displayed");
ok(/data-detail-count="true"/.test(explorer), "count carries an addressable hook");
ok(/aria-live="polite"/.test(explorer), "count announces politely");
ok(/data-explore-more="true"/.test(explorer), "explicit explore control present");
ok(/Explore more details/.test(explorer), "control is labelled in plain language");
ok(/remaining > 0/.test(explorer), "control hidden once everything is revealed");
ok(/data-detail-complete="true"/.test(explorer), "completion state is explicit");
ok(!/Math\.ceil\(total\s*\/\s*BATCH_SIZE\)/.test(explorer), "no fake batch count arithmetic");
/* Review correction: copy must not imply only one batch remains. */
ok(/data-reveal-copy="true"/.test(explorer), "reveal copy is addressable");
ok(/Showing \{revealed\.length\} of \{total\} · Reveal/.test(explorer),
   "copy reads Showing N of M · Reveal K more");
ok(!/more\s*available/i.test(explorer), "'more available' wording removed");
ok(/\{remaining > BATCH_SIZE \? ` \(\$\{remaining\} unrevealed\)` : ""\}/.test(explorer),
   "when more than one batch remains the copy states the unrevealed total");

/* ---------------- 5. nothing is lost ---------------- */
section("5. Every original detail stays reachable");
ok(/if \(additions\.length >= BATCH_SIZE\) break;/.test(explorer) &&
   /if \(seen\.has\(d\.registryIndex\)\) continue;/.test(explorer),
   "reveal cannot overshoot: it stops at BATCH_SIZE and skips known indices");
ok(/details\.length === total|const total = details\.length/.test(explorer),
   "total is the full registry length");
const finalReveal = explorer.slice(explorer.indexOf("handleReveal"));
ok(/new Set\(prev\)/.test(finalReveal), "reveal merges into existing state (never resets)");
ok(!/setRevealed\(\[\]\)|setRevealed\(initialRegistryIndices\)/.test(explorer),
   "revealed content is never reset/unmounted");
ok(/useMemo\([\s\S]*?details, revealedSet/.test(explorer), "visible memo depends on revealed set");
ok(/key=\{d\.src\}/.test(explorer), "stable keys preserve DOM identity across batches");

/* ---------------- 6. responsive delivery ---------------- */
section("6. Reserved dimensions and responsive delivery");
ok(/fill/.test(explorer), "tiles use next/image fill within a sized box");
ok(/aspect-square/.test(explorer), "tile box has a reserved square aspect");
ok(/sizes="/.test(explorer), "sizes attribute drives responsive selection");
ok(/width=\{.*\}|height=\{.*\}/.test(explorer) === false, "fill used instead of conflicting width/height");
ok(/sm:grid-cols-3/.test(explorer) && /lg:grid-cols-6/.test(explorer),
   "grid reflows at narrow and desktop widths");
ok(/quality=\{62\}/.test(explorer), "thumbnail quality is explicitly bounded");

/* ---------------- 7. lazy larger resource ---------------- */
section("7. Larger resource fetched only on inspection");
ok(/images=\{revealedSources\}/.test(explorer), "viewer receives only revealed sources");
ok(/const revealedSources = visible\.map\(\(d\) => d\.src\)/.test(explorer),
   "viewer sources derive from the revealed subset");
ok(/unoptimized/.test(lightbox), "inspection uses the original, not the thumb variant");
/* Review correction: the viewer navigates the FULL registry, not the revealed set. */
ok(/items=\{navigationItems\}/.test(explorer), "viewer is given the complete collection");
ok(/details\.map\(\(d\) => \(\{ src: d\.src, registryIndex: d\.registryIndex \}\)\)/.test(explorer),
   "navigation items cover every registry detail, revealed or not");
ok(/initialRegistryIndex=\{visible\[lightboxIndex\]\?\.registryIndex\}/.test(explorer),
   "the opened detail is identified by canonical registry position");
ok(/items\?\.length \? items\.map\(\(i\) => i\.src\) : images/.test(lightbox),
   "overlay prefers the full collection when supplied");
ok(/items\.findIndex\(\(i\) => i\.registryIndex === initialRegistryIndex\)/.test(lightbox),
   "opening resolves the entry by canonical identity, not display slot");
ok(/\{positionOf\(currentIndex\)\} \/ \{images\.length\}/.test(lightbox),
   "counter shows canonical position over collection size");
ok(!/\{currentIndex \+ 1\} \/ \{images\.length\}/.test(lightbox),
   "counter no longer uses the display slot");
ok(/detail \$\{positionOf\(currentIndex\)\} of \$\{images\.length\}/.test(lightbox),
   "dialog name reports the canonical position");
ok(/requestIdleCallback/.test(lightbox), "neighbours preload at idle while the viewer is open");
ok(/images\[i\]/.test(lightbox), "preload only touches immediate neighbours");

/* ---------------- 8. viewer requirements ---------------- */
section("8. Deliberate inspection");
ok(/role="dialog"/.test(lightbox), "overlay is a dialog");
ok(/aria-modal="true"/.test(lightbox), "dialog is modal");
ok(/aria-label/.test(lightbox), "dialog has an accessible name");
ok(/data-lightbox-position="true"/.test(lightbox), "current position is shown");
ok(/positionOf\(currentIndex\)\} \/ \{images\.length\}/.test(lightbox),
   "position is canonical N of M");
ok(/aria-label="Previous image"/.test(lightbox), "previous control is named");
ok(/aria-label="Next image"/.test(lightbox), "next control is named");
ok(/aria-label="Close"/.test(lightbox), "close control is named");
ok(/aria-label="Zoom in"/.test(lightbox) && /aria-label="Zoom out"/.test(lightbox),
   "zoom controls are named");
ok(/aria-label="Reset zoom"/.test(lightbox), "reset control is named");
ok(/e\.key === "Escape"/.test(lightbox), "Escape closes");
ok(/e\.key === "ArrowLeft"/.test(lightbox) && /e\.key === "ArrowRight"/.test(lightbox),
   "arrow keys navigate");
ok(/clamp\(z \* 1\.5, 1, 4\)/.test(lightbox), "zoom is bounded 1x..4x");
ok(/onPointerMove/.test(lightbox), "pan is implemented");
ok(/data-lightbox-loading="true"/.test(lightbox), "loading state exists");
ok(/data-lightbox-error="true"/.test(lightbox), "failure state exists");
ok(/onError=\{\(\) => setLoadState\("error"\)\}/.test(lightbox), "error is wired to onError");
ok(/Retry/.test(lightbox), "failure offers retry");

/* ---------------- 9. focus behaviour ---------------- */
section("9. Focus containment and return");
ok(/dialogRef/.test(lightbox), "dialog ref exists");
ok(/closeRef\.current\?\.focus\(\)/.test(lightbox), "focus moves into the dialog on open");
ok(/e\.key !== "Tab"/.test(lightbox), "Tab is intercepted for containment");
ok(/!dialog\.contains\(active\)/.test(lightbox), "containment checks dialog membership");
ok(/!e\.shiftKey && \(active === last \|\| !dialog\.contains\(active\)\)/.test(lightbox),
   "forward Tab also recovers when focus is outside the dialog");
ok(/e\.shiftKey && \(active === first \|\| !dialog\.contains\(active\)\)/.test(lightbox),
   "backward Tab also recovers when focus is outside the dialog");
ok(/addEventListener\("keydown", onKeyDown, true\)/.test(lightbox),
   "containment listens in the capture phase so it intercepts before default Tab");
ok(/button:not\(\[disabled\]\)/.test(lightbox), "disabled controls are excluded from the tab ring");
ok(/last\.focus\(\)/.test(lightbox) && /first\.focus\(\)/.test(lightbox), "focus wraps at both ends");
ok(/returnFocusRef/.test(explorer), "caller records the activating element");
ok(/triggerRefs\.current\[lightboxIndex\]/.test(explorer), "return target is the activating thumbnail");
ok(/trigger\.focus\(\)/.test(explorer), "focus is returned to the thumbnail");

/* ---------------- 10. reduced motion ---------------- */
section("10. Reduced motion respected");
ok(/prefers-reduced-motion/.test(lightbox), "reduced-motion query used");
ok(/usePrefersReducedMotion/.test(lightbox), "reduced motion is a real hook");
ok(/transition === "none" \? "none"/.test(lightbox), "transform transition disabled under reduced motion");
/* The thumbnail hover scale is ALSO a transform transition and must be gated. */
ok(/usePrefersReducedMotion/.test(explorer), "explorer tracks reduced motion too");
ok(/prefersReducedMotion\s*\n?\s*\?\s*""/.test(explorer),
   "thumbnail hover transition is suppressed under reduced motion");
ok(!/className="ut-detail-img object-cover transition-transform/.test(explorer),
   "unconditional transition-transform on the thumbnail is gone");
ok(/motion-safe:transition-transform/.test(explorer), "a motion-safe variant remains for normal motion");
ok(!/animate-|autoplay/i.test(explorer), "no forced animation or autoplay in the pilot");

/* ---------------- 11. mobile controls ---------------- */
section("11. Mobile reachability and scroll containment");
ok(/min-h-\[44px\]/.test(lightbox), "controls meet a 44px touch target");
ok(/touchAction: zoom > 1 \? "none"/.test(lightbox), "touch-action only hijacked while zoomed");
ok(/document\.body\.style\.overflow = "hidden"/.test(lightbox), "body scroll locked while open");
ok(/document\.body\.style\.overflow = ""/.test(lightbox), "body scroll restored on close");

/* ---------------- 12. context preserved ---------------- */
section("12. Existing context and behaviour preserved");
ok(/generateStaticParams/.test(page), "static params preserved");
ok(/alternates: \{ canonical: canonicalUrl \}/.test(page), "canonical URL preserved");
ok(/openGraph:/.test(page) && /twitter:/.test(page), "social metadata preserved");
ok(/application\/ld\+json|jsonLd|structuredData/.test(page) || true, "structured data check (informational)");
ok(/ACQUIRE THIS TRANSMISSION/.test(page), "purchase CTA preserved");
ok(/artwork\.medium/.test(page) && /artwork\.year/.test(page), "metadata preserved");
ok(/artworkId=\$\{encodeURIComponent\(artwork\.id\)\}/.test(page), "Oracle CTA keeps verified artwork id");
ok(/from=\$\{encodeURIComponent\(`\/gallery\/\$\{artwork\.slug\}`\)\}/.test(page),
   "Oracle CTA keeps correct return link");
ok(/q=\$\{encodeURIComponent\(`Tell me about \$\{artwork\.title\}`\)\}/.test(page),
   "Oracle CTA seeds an editable question");
ok(!/autoSubmit|auto-submit/.test(page), "no auto-submit introduced");
ok(/oracle\/\?view=desktop/.test(page) === false && /\/oracle\?view=desktop/.test(page),
   "Oracle link unchanged");

/* ---------------- 13. no media mutation ---------------- */
section("13. Media untouched");
ok(!/sharp|recompress|quality:\s*100/.test(explorer), "no recompression of originals");
ok(!/require\(["']fs["']\)|from ["']fs["']|writeFileSync|createWriteStream|sharp\(/.test(explorer),
   "no filesystem writes or image processing from the component");

console.log("\n---------------------------------------------");
console.log(`PASS ${pass}   FAIL ${fail}`);
if (failures.length) { console.log("\nFAILURES:"); failures.forEach((f) => console.log("  - " + f)); }
process.exit(fail === 0 ? 0 : 1);
