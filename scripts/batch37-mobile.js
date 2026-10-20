#!/usr/bin/env node
/**
 * batch37-mobile.js — the mobile entrance, bounded.
 *
 * Batch 37 replaces a dismissive entrance line with an accurate invitation and lifts the menu
 * toggle to the 44px touch floor. Everything else is preserved: the Codex book and the Gallery stay
 * primary, the Shop stays one reachable step away, the heavy instruments stay behind their own
 * explicit routes, and there is still exactly one website.
 *
 * These are source assertions. The rendered evidence (geometry, touch targets, overflow, journeys)
 * is measured in the browser against the preview, because none of it can be inferred from a file.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let passed = 0;
const failures = [];

function ok(condition, label) {
  if (condition) {
    passed += 1;
    console.log("    pass  " + label);
  } else {
    failures.push(label);
    console.log("    FAIL  " + label);
  }
}

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const home = read("src/app/page.tsx");
const nav = read("src/components/ui/Navigation.tsx");

console.log("\n  1. the entrance message");
{
  const dismissive = /put down your mobile device/i;
  ok(!dismissive.test(home), "the dismissive 'put down your mobile device' line is gone from the homepage");
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
        walk(full);
      } else if (/\.(tsx?|jsx?|mdx?)$/.test(entry.name)) {
        if (dismissive.test(fs.readFileSync(full, "utf8"))) offenders.push(path.relative(ROOT, full));
      }
    }
  };
  walk(path.join(ROOT, "src"));
  ok(offenders.length === 0, "no source file tells a visitor to put the device down (" + (offenders.join(", ") || "none") + ")");

  ok(/Signal mode/.test(home), "the entrance names the mobile experience: signal mode");
  ok(/Fast\.\s*Readable\.\s*Still strange\./.test(home), "it states the promise: fast, readable, still strange");
  ok(/Codex/.test(home.split("Signal mode")[1]?.slice(0, 260) || "") && /Gallery/.test(home.split("Signal mode")[1]?.slice(0, 260) || ""),
    "the invitation points at the Codex and the Gallery, not away from the site");
  const line = home.split("\n").find((l) => /Signal mode/.test(l)) || "";
  ok(line.trim().replace(/^[^A-Za-z]*/, "").length > 60, "the line is written as an invitation, not a slogan");
}

console.log("\n  2. the touch floor on the menu toggle");
{
  ok(/minWidth: 44/.test(nav) && /minHeight: 44/.test(nav),
    "the mobile menu toggle declares a 44px floor in both axes");
  ok(/aria-expanded=\{mobileOpen\}/.test(nav), "the toggle still reports its expanded state");
  ok(/aria-label=\{mobileOpen \? "Close menu" : "Open menu"\}/.test(nav), "the toggle still has a spoken name for each state");
  ok(!/className="lg:hidden p-2"/.test(nav), "the old 36px padding-only toggle is gone");
}

console.log("\n  3. what must not change");
{
  ok(/href="\/codex"/.test(home) && /DISCOVER THE CODEX/.test(home), "the Codex remains a primary entrance action");
  ok(/href="\/gallery"/.test(home) && /ENTER THE GALLERY/.test(home), "the Gallery remains a primary entrance action");
  ok(/\/sanctum/.test(nav), "the Shop stays reachable from the navigation");
  ok(/\/oracle/.test(nav), "the Oracle stays reachable from the navigation");
  ok(/lg:hidden/.test(nav), "the menu is still a single responsive navigation, not a second site");
  ok(!fs.existsSync(path.join(ROOT, "src/app/m")), "no separate mobile website was created");
  ok(!/mode chooser|choose your experience/i.test(home), "no mode chooser was introduced");

  /* The instruments stay behind their own routes: the homepage may link to them, never mount them. */
  ok(!/import .*RotatingMerkaba/.test(home), "no heavy instrument is mounted into the homepage entrance");

  /* Batch 36 typography is untouched by this batch. */
  const zalgo = read("src/components/ui/ZalgoText.tsx");
  ok(/data-glyph-burst/.test(zalgo) && /startBurst\(/.test(zalgo), "the accepted typography component is unchanged in behaviour");
}

console.log("\n  ==================== SUMMARY ====================");
console.log("   assertions passed: " + passed + "   assertions failed: " + failures.length);
failures.forEach((f) => console.log("    FAIL " + f));
console.log("   RESULT: " + (failures.length === 0 ? "PASS" : "FAIL"));
process.exit(failures.length === 0 ? 0 : 1);
