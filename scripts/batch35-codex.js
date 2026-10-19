#!/usr/bin/env node
/**
 * batch35-codex.js — the Codex preview set, its honest limits, and the WebGL guard.
 *
 * Pure behaviour against the shipped modules: the preview manifest is checked against the files
 * themselves (declared dimensions must equal the JPEG's own), the zoom ceiling must follow the
 * asset rather than the window, and the WebGL probe is driven through every failure shape a browser
 * can present — refusing a context, throwing, and returning null.
 *
 * The page-wiring assertions at the end are a smoke check only; the behavioural proof that a
 * WebGL-less browser still gets a working book is the browser capture, not this file.
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs")).registerTsModules({ root: ROOT });

const S = require(path.join(ROOT, "src/lib/codex-spreads.ts"));
const W = require(path.join(ROOT, "src/lib/webgl-support.ts"));
const Z = require(path.join(ROOT, "src/lib/zoom.ts"));

let pass = 0, fail = 0;
const failures = [];
function ok(condition, message) {
  if (condition) { pass += 1; console.log("    ok   " + message); }
  else { fail += 1; failures.push(message); console.log("    FAIL " + message); }
}

/** Minimal JPEG frame-header reader — the file's own answer, not a remembered number. */
function jpegSize(file) {
  const buf = fs.readFileSync(file);
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i += 1; continue; }
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

console.log("\n  1. the published preview set is the files that actually ship");
{
  ok(S.CODEX_PREVIEWS.length === 5, "five previews are published (" + S.CODEX_PREVIEWS.length + ")");
  const ids = new Set(S.CODEX_PREVIEWS.map((p) => p.id));
  ok(ids.size === S.CODEX_PREVIEWS.length, "ids are unique");

  let missing = 0, mismatched = 0;
  for (const preview of S.CODEX_PREVIEWS) {
    const file = path.join(ROOT, "public", preview.src.replace(/^\//, ""));
    if (!fs.existsSync(file)) { missing += 1; console.log("       missing:", preview.src); continue; }
    const actual = jpegSize(file);
    if (!actual || actual.width !== preview.width || actual.height !== preview.height) {
      mismatched += 1;
      console.log("       declared", preview.width + "x" + preview.height, "actual", actual);
    }
  }
  ok(missing === 0, "every declared asset exists in public/");
  ok(mismatched === 0, "every declared dimension equals the file's own (no remembered numbers)");
}

console.log("\n  2. nothing is inferred from a filename");
{
  const pageish = S.CODEX_PREVIEWS.filter((p) => /page|p\.?\s?\d|pg\.?\s?\d/i.test(p.label));
  ok(pageish.length === 0, "no label claims a printed page number");
  ok(S.CODEX_PREVIEWS.every((p) => p.label === "Cover" || /^Preview \d$/.test(p.label)),
    "labels are positional: Cover + Preview 1..4");
  const srcBearing = S.CODEX_PREVIEWS.filter((p) => p.label.includes("146"));
  ok(srcBearing.length === 0, "a filename digit never becomes a label (spread-146 is not 'page 146')");
}

console.log("\n  3. proportions are the source's own");
{
  let wrong = 0;
  for (const preview of S.CODEX_PREVIEWS) {
    const actual = jpegSize(path.join(ROOT, "public", preview.src.replace(/^\//, "")));
    if (!actual) { wrong += 1; continue; }
    if (Math.abs(S.previewAspect(preview) - actual.width / actual.height) > 0.001) wrong += 1;
    if (S.naturalWidthFor(preview) !== actual.width) wrong += 1;
  }
  ok(wrong === 0, "every aspect ratio and natural width matches the asset");
  ok(S.CODEX_PREVIEWS.every((p) => S.previewAspect(p) !== 3 / 4),
    "no preview is forced into the released 3:4 crop box");
}

console.log("\n  4. enlargement stops where the pixels stop");
{
  ok(S.zoomCeilingFor(null) === 1, "no preview means no enlargement");
  const small = S.CODEX_PREVIEWS.filter((p) => p.width <= 640);
  ok(small.length >= 1, "there are 640px-wide spreads to protect");
  ok(small.every((p) => S.zoomCeilingFor(p) <= 2), "a 640px source never offers more than 2x");
  const big = S.CODEX_PREVIEWS.find((p) => p.width >= 900);
  ok(big && S.zoomCeilingFor(big) <= 3, "the 900px cover offers a little more, still bounded");
  ok(S.CODEX_PREVIEWS.every((p) => S.zoomCeilingFor(p) >= 1), "every ceiling allows at least a 1x view");
}

console.log("\n  5. the WebGL probe answers every way a browser can refuse");
{
  ok(W.supportsWebGL(null) === false, "no factory at all → unsupported");
  ok(W.supportsWebGL(() => null) === false, "factory returns null → unsupported");
  ok(W.supportsWebGL(() => { throw new Error("blocked"); }) === false, "factory throws → unsupported");
  ok(W.supportsWebGL(() => ({ getContext: () => null })) === false, "context refused → unsupported");
  ok(W.supportsWebGL(() => ({ getContext: () => { throw new Error("denied"); } })) === false,
    "context call throws → unsupported");
  ok(W.supportsWebGL(() => ({ getContext: (id) => (id === "webgl" ? { ok: true } : null) })) === true,
    "a returned context object → supported");
  ok(W.supportsWebGL(() => ({ getContext: (id) => (id === "webgl2" ? { ok: true } : null) })) === true,
    "webgl2 alone is enough");
  ok(W.supportsWebGL(() => ({ getContext: (id) => (id.startsWith("webgl") || id === "experimental-webgl" ? { ok: true } : null) })) === true,
    "experimental-webgl is accepted");
}

console.log("\n  6. the page wires the guard and the viewer (smoke)");
{
  const page = fs.readFileSync(path.join(ROOT, "src/app/codex/page.tsx"), "utf8");
  ok(/<WebGLBoundary>[\s\S]{0,200}<RotatingMerkaba \/>/.test(page), "the decorative canvas sits inside the boundary");
  ok(page.includes("<CodexSpreads />"), "the preview strip is the inspecting component");
  ok(!page.includes("aspect-[3/4] overflow-hidden\">\n                    <Image\n                      src=\"/codex/book/spread"), "the cropped spread grid is gone");

  const spreads = fs.readFileSync(path.join(ROOT, "src/components/codex/CodexSpreads.tsx"), "utf8");
  ok(spreads.includes("LightboxOverlay"), "the shipped viewer is reused, not reimplemented");
  ok(/zoomCeilingFor\(displayed\)/.test(spreads), "the ceiling is resolved from the DISPLAYED image, not the clicked one");
  ok(!/zoomCeilingFor\(opened\)/.test(spreads), "the ceiling is not pinned to the preview that was opened");
  ok(/object-contain/.test(spreads), "thumbnails contain the whole image");
}

console.log("\n  7. the ceiling follows the image on screen, through every control");
{
  const byId = (id) => S.CODEX_PREVIEWS.find((p) => p.id === id);
  const cover = byId("vol1-cover");
  const spread = byId("spread-06");
  ok(S.zoomCeilingFor(cover) === 2.5, "the cover's ceiling is 2.5");
  ok(S.zoomCeilingFor(spread) === 2, "the 640px spread's ceiling is 2");

  /* Cover -> spread: three zoom-ins cannot pass 200%, and Zoom-in must be disabled there. */
  let zoom = 1;
  const coverSteps = [];
  for (let i = 0; i < 4; i += 1) { zoom = Z.zoomBy(zoom, S.zoomCeilingFor(cover), 1.5); coverSteps.push(zoom); }
  ok(coverSteps[0] === 1.5 && coverSteps[1] === 2.25 && coverSteps[2] === 2.5 && coverSteps[3] === 2.5,
    "on the cover, zoom stops at 250% (" + coverSteps.join(" → ") + ")");
  ok(Z.canZoomIn(zoom, S.zoomCeilingFor(cover)) === false, "Zoom-in is disabled at the cover's 250%");

  let spreadZoom = 1;
  const spreadSteps = [];
  for (let i = 0; i < 4; i += 1) { spreadZoom = Z.zoomBy(spreadZoom, S.zoomCeilingFor(spread), 1.5); spreadSteps.push(spreadZoom); }
  ok(spreadSteps[0] === 1.5 && spreadSteps[1] === 2 && spreadSteps[2] === 2 && spreadSteps[3] === 2,
    "on a 640px spread, zoom stops at 200% (" + spreadSteps.join(" → ") + ")");
  ok(Z.canZoomIn(spreadZoom, S.zoomCeilingFor(spread)) === false, "Zoom-in is disabled at the spread's 200%");

  /* Changing the image while enlarged cannot leave an impossible zoom behind. */
  ok(Z.clampZoom(2.5, S.zoomCeilingFor(spread)) === 2, "carrying 250% onto a spread clamps to 200%");
  ok(Z.clampZoom(2, S.zoomCeilingFor(cover)) === 2, "carrying 200% onto the cover stays legal");
  ok(Z.clampZoom(1, S.zoomCeilingFor(spread)) === 1, "reset to 100% is always legal");

  /* Keyboard zoom must obey the same ceiling as the buttons — it did, which is why one rule is used. */
  let kb = 1;
  for (let i = 0; i < 6; i += 1) kb = Z.zoomBy(kb, S.zoomCeilingFor(spread), 1.5);
  ok(kb === 2, "six keyboard steps stop at the same 200%");
  ok(Z.zoomBy(kb, 2, 1 / 1.5) === 1.3333333333333333, "keyboard zoom-out steps back down by the same factor");

  /* The gallery's ceiling is untouched. */
  ok(Z.DEFAULT_ZOOM_CEILING === 4, "the gallery default ceiling is still 4");
  let gal = 1;
  for (let i = 0; i < 8; i += 1) gal = Z.zoomBy(gal, Z.DEFAULT_ZOOM_CEILING, 1.5);
  ok(gal === 4, "the gallery still reaches 400% and stops (" + gal + ")");
  ok(Z.clampZoom(9, Z.DEFAULT_ZOOM_CEILING) === 4, "the gallery still clamps anything above 4");
  ok(Z.clampZoom(9, null) === 1 && Z.clampZoom(9, undefined) === 1 && Z.clampZoom(9, NaN) === 1,
    "a missing or broken ceiling never magnifies");

  const lightbox = fs.readFileSync(path.join(ROOT, "src/components/gallery/Lightbox.tsx"), "utf8");
  ok(!/zoom >= 4/.test(lightbox), "the Zoom-in button no longer tests a literal 4");
  ok(/canZoomIn\(zoom, maxZoom\)/.test(lightbox), "the Zoom-in button tests the active ceiling");
  ok(/maxZoom = DEFAULT_ZOOM_CEILING/.test(lightbox), "the overlay's default comes from the shared constant");
  ok(/clampZoom\(z, maxZoom\)/.test(lightbox), "a ceiling change clamps the current zoom instead of carrying it");
}

console.log("\n  ==================== SUMMARY ====================");
console.log(`   assertions passed: ${pass}   assertions failed: ${fail}`);
if (fail) {
  failures.forEach((f) => console.log("   FAIL " + f));
  console.log("   RESULT: FAIL");
  process.exit(1);
}
console.log("   RESULT: PASS");
process.exit(0);
