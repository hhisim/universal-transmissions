#!/usr/bin/env python3
"""batch16b-research-journey.py — the finished exploration, walked end to end.

  Nexus -> a chosen Geometry relationship -> its destination -> the Oracle in that
  context -> back to research.

Plus the three things a screenshot cannot show: keyboard operation, reduced-motion
behaviour, and whether the reveal wrappers leave content invisible to a visitor with
no JavaScript.

Captures: desktop and a real 390 CSS px viewport, of the selected inspector and of the
Geometry content AFTER scrolling (so the shot shows the revealed page, not a blank one).

Usage:
  python3 scripts/batch16b-research-journey.py <base-url> [out-dir]
"""
import json
import os
import sys
import time

from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

BASE = (sys.argv[1] if len(sys.argv) > 1 else "").rstrip("/")
OUT = sys.argv[2] if len(sys.argv) > 2 else "/root/b16b"
SHOTS = os.path.join(OUT, "screens")
os.makedirs(SHOTS, exist_ok=True)

checks, failed, screens = [], [], []


def check(label, cond, detail=None):
    checks.append({"check": label, "ok": bool(cond), **({"detail": detail} if detail is not None else {})})
    print(f"  {'ok  ' if cond else 'FAIL'} {label}" + (f" — {detail}" if detail and not cond else ""))
    if not cond:
        failed.append(label)


def shot(page, name, full=True):
    path = os.path.join(SHOTS, name)
    page.screenshot(path=path, full_page=full)
    screens.append({"file": name, "bytes": os.path.getsize(path)})
    return path


def scroll_through(page):
    """Walk the page so every reveal has fired before we capture it."""
    page.evaluate("""async () => {
      const step = Math.round(window.innerHeight * 0.8);
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 120));
      }
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise(r => setTimeout(r, 400));
      window.scrollTo(0, 0);
      await new Promise(r => setTimeout(r, 250));
    }""")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ── reduced motion, desktop ───────────────────────────────────────────
        print("=== reduced motion + desktop: the nexus and the inspector ===")
        ctx = browser.new_context(viewport={"width": 1440, "height": 1000},
                                  reduced_motion="reduce")
        page = ctx.new_page()
        page.set_default_timeout(90000)
        page.goto(BASE + "/research", wait_until="networkidle")
        page.wait_for_selector("[data-research-nexus='true']", state="visible")

        relationships = page.query_selector_all("[data-nexus-relationship]")
        check("a compact set of relationships is offered", len(relationships) == 12, str(len(relationships)))
        check("an inspector opens on the first relationship",
              bool(page.query_selector("[data-nexus-inspector]")))

        # select a Geometry relationship by clicking (a real visitor action)
        page.click("[data-nexus-filter='geometry']")
        page.wait_for_timeout(300)
        page.click("[data-nexus-relationship='artwork-tetra']")
        page.wait_for_timeout(400)
        insp = page.query_selector("[data-nexus-inspector='artwork-tetra']")
        check("choosing a relationship opens THAT relationship's inspector", bool(insp))
        body = " ".join(insp.inner_text().split()) if insp else ""
        for needle, label in (("what it connects", "what it connects"),
                              ("why it connects", "why it connects"),
                              ("how well it is supported", "how well it is supported"),
                              ("the records behind it", "the records behind it"),
                              ("open the record", "where to go next")):
            check(f"the inspector shows {label}", needle in body.lower())
        check("the inspector states its basis in words",
              "documented reference" in body.lower()
              and "named in an existing ut record" in body.lower(),
              body[:160])
        # A relationship held on a weaker basis must read differently — the label is not
        # decoration, it is the difference between a named record and a shared idea.
        page.click("[data-nexus-relationship='room-cymatics']")
        page.wait_for_timeout(400)
        themed = page.query_selector("[data-nexus-inspector='room-cymatics']")
        tbody = " ".join(themed.inner_text().split()).lower() if themed else ""
        check("a thematic relationship is labelled as an association, not a sourced link",
              "thematic association" in tbody and "not a sourced link" in tbody, tbody[:160])
        page.click("[data-nexus-relationship='artwork-tetra']")
        page.wait_for_timeout(300)
        check("the inspector offers the contextual Oracle path",
              bool(page.query_selector("[data-nexus-inspector='artwork-tetra'] [data-nexus-oracle]")))
        scroll_through(page)
        shot(page, "16b-desktop-inspector-selected.png")

        # ── reduced motion actually honoured ──────────────────────────────────
        print("\n=== reduced motion is honoured (reveal wrappers) ===")
        m = page.evaluate("""() => {
          const els = Array.from(document.querySelectorAll('[data-reveal]'));
          const hidden = els.filter(e => {
            const cs = getComputedStyle(e);
            return parseFloat(cs.opacity) < 1 || (cs.transform && cs.transform !== 'none');
          });
          return {total: els.length, hidden: hidden.length};
        }""")
        check("every reveal wrapper is fully visible under reduced motion",
              m["hidden"] == 0, json.dumps(m))

        # ── keyboard ──────────────────────────────────────────────────────────
        print("\n=== keyboard operation ===")
        page.goto(BASE + "/research", wait_until="networkidle")
        page.wait_for_selector("[data-nexus-filter='geometry']", state="visible")
        page.focus("[data-nexus-filter='geometry']")
        page.keyboard.press("Enter")
        page.wait_for_timeout(300)
        check("the room filter operates from the keyboard",
              page.get_attribute("[data-nexus-filter='geometry']", "aria-pressed") == "true")

        page.focus("[data-nexus-relationship='artwork-tetra']")
        page.keyboard.press("Enter")
        page.wait_for_timeout(300)
        check("Enter selects a relationship from the keyboard",
              bool(page.query_selector("[data-nexus-inspector='artwork-tetra']")))
        page.keyboard.press("ArrowDown")
        page.wait_for_timeout(300)
        after = page.query_selector("[data-nexus-inspector]")
        check("ArrowDown moves to the next relationship",
              after is not None and after.get_attribute("data-nexus-inspector") != "artwork-tetra",
              after.get_attribute("data-nexus-inspector") if after else "none")

        reached = page.evaluate("""() => {
          const el = document.querySelector('[data-nexus-inspector] [data-nexus-oracle]');
          if (!el) return false;
          el.focus();
          return document.activeElement === el;
        }""")
        check("the Oracle link inside the inspector is focusable", reached)

        # ── the walk ──────────────────────────────────────────────────────────
        print("\n=== the walk: relationship -> destination -> Oracle -> back ===")
        # The ArrowDown check above moved the selection on; reselect the one we walk.
        page.click("[data-nexus-relationship='artwork-tetra']")
        page.wait_for_timeout(300)
        dest = page.get_attribute("[data-nexus-inspector='artwork-tetra'] [data-nexus-destination]", "href")
        check("the inspector names its destination", dest == "/gallery/tetra", str(dest))

        page.goto(BASE + "/research/geometry", wait_until="networkidle")
        page.wait_for_selector("[data-connection-anchor]", state="visible")
        scroll_through(page)
        shot(page, "16b-desktop-geometry-scrolled.png")
        check("the Geometry room is reachable and lists its connections",
              len(page.query_selector_all("[data-connection-anchor]")) == 6)

        page.goto(BASE + dest, wait_until="networkidle")
        check("the destination record opens", "Tetra" in page.title(), page.title())

        page.goto(BASE + "/research/geometry", wait_until="networkidle")
        page.wait_for_selector("[data-connection-oracle='artwork-tetra']", state="visible")
        page.click("[data-connection-oracle='artwork-tetra']")
        page.wait_for_selector(".oracle-artwork-context", timeout=90000)
        page.wait_for_timeout(1200)
        chip = page.query_selector(".oracle-artwork-context")
        check("the Oracle carries the chosen Geometry relationship as context",
              bool(chip) and "tetra" in chip.inner_text().lower(),
              " ".join(chip.inner_text().split())[:100] if chip else "no chip")

        back = page.query_selector("a[href*='/research/geometry']")
        page.goto(BASE + "/research", wait_until="networkidle")
        check("the visitor can return to research", "THE RESEARCH" in page.content().upper())

        # ── no JavaScript ─────────────────────────────────────────────────────
        print("\n=== without JavaScript, is the content still there? ===")
        nojs = browser.new_context(java_script_enabled=False,
                                   viewport={"width": 1440, "height": 1000})
        np = nojs.new_page()
        np.goto(BASE + "/research", wait_until="load")
        np.wait_for_timeout(800)
        check("the nexus markup is present without JavaScript",
              np.query_selector("[data-research-nexus-section]") is not None)
        # CSS still applies with scripting off, so the [data-reveal] rules must win
        # over the inline hidden state that the prerender ships.
        vis = np.evaluate("""() => {
          const el = document.querySelector('[data-reveal]');
          if (!el) return null;
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return {opacity: cs.opacity, transform: cs.transform, height: Math.round(r.height)};
        }""")
        check("a reveal wrapper is visible without JavaScript",
              bool(vis) and vis.get("opacity") == "1" and vis.get("transform") in ("none", ""),
              json.dumps(vis))
        shot(np, "16b-nojs-nexus.png")
        nojs.close()

        # ── 390 CSS px ────────────────────────────────────────────────────────
        print("\n=== 390 CSS px: the inspector and the Geometry content, after scrolling ===")
        page.set_viewport_size({"width": 390, "height": 844})
        page.goto(BASE + "/research", wait_until="networkidle")
        page.wait_for_selector("[data-research-nexus='true']", state="visible")
        page.click("[data-nexus-filter='geometry']")
        page.wait_for_timeout(300)
        page.click("[data-nexus-relationship='room-cymatics']")
        page.wait_for_timeout(400)
        scroll_through(page)
        shot(page, "16b-mobile390-inspector-selected.png")
        mm = page.evaluate("""() => {
          const doc = document.documentElement;
          const insp = document.querySelector('[data-nexus-inspector]');
          const r = insp ? insp.getBoundingClientRect() : null;
          return {innerWidth: window.innerWidth,
                  docOverflow: doc.scrollWidth - window.innerWidth,
                  inspectorRight: r ? Math.round(r.right) : null,
                  inspectorWidth: r ? Math.round(r.width) : null};
        }""")
        check("390: a real 390 CSS px viewport", mm["innerWidth"] == 390, str(mm["innerWidth"]))
        check("390: no horizontal overflow", mm["docOverflow"] == 0, f"{mm['docOverflow']}px")
        check("390: the inspector fits the viewport",
              mm["inspectorRight"] is not None and mm["inspectorRight"] <= 390, json.dumps(mm))

        page.goto(BASE + "/research/geometry", wait_until="networkidle")
        page.wait_for_selector("[data-connection-anchor]", state="visible")
        scroll_through(page)
        shot(page, "16b-mobile390-geometry-scrolled.png")
        gm = page.evaluate("""() => ({innerWidth: window.innerWidth,
                                      docOverflow: document.documentElement.scrollWidth - window.innerWidth})""")
        check("390 Geometry: no horizontal overflow", gm["docOverflow"] == 0, json.dumps(gm))

        with open(os.path.join(OUT, "journey2.json"), "w", encoding="utf-8") as fh:
            json.dump({"base": BASE, "checks": checks, "failed": failed, "screenshots": screens,
                       "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())},
                      fh, indent=2, ensure_ascii=False)
        print(f"\nassertions passed: {len(checks) - len(failed)}")
        print("assertions failed:", len(failed))
        for f in failed:
            print("  -", f)
        print("screenshots:")
        for s in screens:
            print(f"  {s['file']}  {s['bytes']}B")
        print("BATCH16B_JOURNEY_" + ("PASSED" if not failed else "FAILED"))
        browser.close()
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
