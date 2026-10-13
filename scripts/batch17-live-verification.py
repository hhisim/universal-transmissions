#!/usr/bin/env python3
"""batch17-live-verification.py — the instrument room, verified live.

The load-bearing claim of this batch is negative: the READING PAGE must start none of
the instrument. That is proven at the network level, not by reading the source — every
request the page makes is recorded, and before launch not one of them may touch the
instrument's bundle.

Then: launching starts it for real (the frame loads, the engine requests its own
assets, a canvas appears), the chain navigates both ways, and the Oracle opens in the
instrument's own context.

Usage: python3 batch17-live-verification.py <base-url> [out.json]
"""
import json
import os
import re
import sys
import unicodedata
import time

from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "").rstrip("/")
OUT = sys.argv[2] if len(sys.argv) > 2 else "/root/b17/live.json"
SHOTS = "/root/b17/screens"
os.makedirs(SHOTS, exist_ok=True)
BUNDLE = "/experience/universal-resonator/"

checks, failed, screens = [], [], []


def check(label, cond, detail=None):
    checks.append({"check": label, "ok": bool(cond), **({"detail": str(detail)} if detail is not None else {})})
    print(f"  {'ok  ' if cond else 'FAIL'} {label}" + (f" — {detail}" if detail and not cond else ""))
    if not cond:
        failed.append(label)


def shot(page, name):
    p = os.path.join(SHOTS, name)
    page.screenshot(path=p, full_page=True)
    screens.append({"file": name, "bytes": os.path.getsize(p)})


with sync_playwright() as pw:
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 1000})
    page = ctx.new_page()
    page.set_default_timeout(90000)

    requested = []
    page.on("request", lambda r: requested.append(r.url))

    def instrument_requests(urls):
        """Requests to the instrument's OWN bundle.

        Next.js emits this route's client chunk under
        /_next/static/chunks/app/experience/universal-resonator/, which is the page's own
        code and not the instrument; only the hosted bundle counts here.
        """
        return [u for u in urls if BUNDLE in u and "/_next/" not in u]

    # ── 1. the reading page starts nothing ────────────────────────────────────
    print("=== the reading page, before any launch ===")
    page.goto(BASE + "/experience/universal-resonator", wait_until="networkidle")
    page.wait_for_selector("[data-resonator-launch='true']", state="visible")
    page.wait_for_timeout(2500)          # give anything eager a chance to fire

    bundle_hits = instrument_requests(requested)
    check("no instrument asset is requested before launch", not bundle_hits,
          ", ".join(u.split("/")[-1] for u in bundle_hits[:6]))
    check("no app.js request", not any("app.js" in u for u in requested))
    check("no worker request", not any("worker.js" in u for u in requested))
    check("no instrument font is fetched", not instrument_requests(
        [u for u in requested if "/fonts/" in u]))
    check("no iframe exists in the DOM yet", page.query_selector("iframe") is None)
    # The UT shell draws its own ambient canvases site-wide (3 on /research, 2 on
    # /research/geometry), so "no canvas anywhere" would be false for reasons that have
    # nothing to do with the instrument. What must be absent is the instrument's frame.
    check("no instrument frame exists to run WebGL",
          page.query_selector("[data-resonator-frame='true']") is None)
    check("the launch action is present and explicit",
          page.query_selector("[data-resonator-launch='true']") is not None)
    check("the page says nothing has started yet",
          "nothing has been started" in page.content().lower())
    shot(page, "b17-reading-page-before-launch.png")

    # ── 2. the model and references are on the reading page ───────────────────
    print("\n=== what the room explains before you run it ===")
    check("the room explains what the instrument solves",
          page.query_selector("[data-instrument-model='true']") is not None)
    check("the room states the model's limit",
          "idealised model" in page.content().lower())
    check("the room carries the references",
          page.query_selector("[data-instrument-references='true']") is not None)
    refs = page.query_selector_all("[data-instrument-references='true'] a[href^='http']")
    check("the references link out to their sources", len(refs) >= 3, len(refs))
    check("the third-party notices are linked",
          page.query_selector("a[href$='THIRD_PARTY_NOTICES.txt']") is not None)

    # ── 3. launch actually starts the instrument ──────────────────────────────
    print("\n=== launch ===")
    requested.clear()
    page.click("[data-resonator-launch='true']")
    page.wait_for_selector("[data-resonator-frame='true']", timeout=60000)
    page.wait_for_timeout(9000)
    after = instrument_requests(requested)
    names = sorted({u.split("/")[-1] for u in after})
    check("launching requests the instrument bundle", bool(after), ", ".join(names[:6]))
    check("the engine bundle itself loads", any(u.endswith("app.js") for u in after))
    check("the solver worker loads", any(u.endswith("worker.js") for u in after))
    check("its own stylesheet loads", any(u.endswith("style.css") for u in after))
    check("its own fonts load", any("/fonts/" in u for u in after))
    check("the stage replaces the launch panel",
          page.query_selector("[data-resonator-stage='true']") is not None
          and page.query_selector("[data-resonator-launch='true']") is None)
    # Reach the instrument's document directly: it is the frame whose URL is its own
    # entry point, and its canvases are the engine's, not the UT shell's.
    frame = None
    for _ in range(20):
        frame = next((f for f in page.frames
                      if "universal-resonator/index.html" in (f.url or "")), None)
        if frame:
            break
        page.wait_for_timeout(1000)
    canvases = 0
    webgl = False
    body = ""
    if frame:
        for _ in range(30):
            try:
                canvases = frame.evaluate("() => document.querySelectorAll('canvas').length")
                webgl = frame.evaluate(
                    "() => { const c=document.createElement('canvas');"
                    " return !!(c.getContext('webgl2')||c.getContext('webgl')); }")
                body = " ".join((frame.evaluate("() => document.body.innerText") or "").split())
            except Exception:
                pass
            if canvases:
                break
            page.wait_for_timeout(1500)
    check("the instrument's own document is running", frame is not None,
          [f.url[:70] for f in page.frames])
    check("a canvas appears inside the instrument (WebGL is running)", canvases > 0, f"{canvases} canvases")
    check("WebGL is available to the instrument", webgl)
    check("the instrument's own interface is up (engine, not a stub)",
          # The title is rendered with the UT skin's Zalgo styling, so combining marks sit
          # INSIDE the words and break a naive substring match. Normalise them away.
          all(w in "".join(c for c in unicodedata.normalize("NFKD", body)
                           if not unicodedata.combining(c)).upper()
              for w in ("RESONATOR", "PLATE")),
          body[:120])
    shot(page, "b17-instrument-launched.png")

    # ── 4. leaving stops it ───────────────────────────────────────────────────
    print("\n=== leaving ===")
    page.click("[data-resonator-stop='true']")
    page.wait_for_timeout(2500)
    check("leaving unmounts the instrument",
          page.query_selector("[data-resonator-frame='true']") is None)
    check("the launch panel returns", page.query_selector("[data-resonator-launch='true']") is not None)

    # ── 5. the chain navigates both ways ──────────────────────────────────────
    print("\n=== Cymatics -> instrument -> back ===")
    page.goto(BASE + "/research/cymatics", wait_until="networkidle")
    page.wait_for_selector("[data-cymatics-connections='true']", state="visible")
    link = page.query_selector("a[href='/experience/universal-resonator']")
    check("the Cymatics room links to the instrument", link is not None)
    anchors = page.eval_on_selector_all(
        "[data-cymatics-connections='true'] [data-connection-anchor]",
        "els => els.map(e => e.getAttribute('data-connection-anchor'))")
    check("the instrument is listed as a connection of the room",
          "instrument-universal-resonator" in anchors, json.dumps(anchors))
    check("the six released anchors are still there, in order",
          anchors[:6] == ["journal-cymatics-language-of-form", "artwork-throat-chakra",
                          "artwork-recursive-pantheism", "codex-frequency-lattice",
                          "artwork-hyperdimensional-harmonics", "journal-kybalion-seven-principles"],
          json.dumps(anchors))
    page.click("[data-connection-anchor='instrument-universal-resonator'] a, a[href='/experience/universal-resonator']")
    page.wait_for_selector("[data-instrument-room='true']", timeout=60000)
    check("following it lands on the instrument room",
          "/experience/universal-resonator" in page.url, page.url)
    page.click("[data-instrument-return='true']")
    page.wait_for_selector("[data-cymatics-connections='true']", timeout=60000)
    check("the room returns to Cymatics research", "/research/cymatics" in page.url, page.url)

    # ── 6. the Oracle opens in the instrument's context ───────────────────────
    print("\n=== the Oracle, in the instrument's context ===")
    page.goto(BASE + "/experience/universal-resonator", wait_until="networkidle")
    page.wait_for_selector("[data-instrument-oracle='true']", state="visible")
    href = page.get_attribute("[data-instrument-oracle='true']", "href")
    check("the Oracle link carries the instrument anchor",
          "instrument-universal-resonator" in href, href[:120])
    check("the Oracle link carries the instrument's own question",
          "q=" in href and "model" in href.lower(), href[:160])
    page.click("[data-instrument-oracle='true']")
    page.wait_for_selector(".oracle-artwork-context", timeout=90000)
    page.wait_for_timeout(2000)
    chip = page.query_selector(".oracle-artwork-context")
    chip_text = " ".join(chip.inner_text().split()) if chip else ""
    check("the Oracle opens carrying the instrument as its subject",
          "resonator" in chip_text.lower(), chip_text[:120])
    shot(page, "b17-oracle-in-context.png")

    # ── 7. mobile + reduced motion ────────────────────────────────────────────
    print("\n=== 390 CSS px, and reduced motion ===")
    page.set_viewport_size({"width": 390, "height": 844})
    page.goto(BASE + "/experience/universal-resonator", wait_until="networkidle")
    page.wait_for_selector("[data-resonator-launch='true']", state="visible")
    mm = page.evaluate("""() => {
      const b = document.querySelector("[data-resonator-launch='true']");
      const r = b ? b.getBoundingClientRect() : null;
      return {innerWidth: window.innerWidth,
              docOverflow: document.documentElement.scrollWidth - window.innerWidth,
              buttonRight: r ? Math.round(r.right) : null};
    }""")
    check("390: a real 390 CSS px viewport", mm["innerWidth"] == 390, mm["innerWidth"])
    check("390: no horizontal overflow", mm["docOverflow"] == 0, mm["docOverflow"])
    check("390: the launch action fits the viewport",
          mm["buttonRight"] is not None and mm["buttonRight"] <= 390, json.dumps(mm))
    shot(page, "b17-mobile390-room.png")

    rm = browser.new_context(viewport={"width": 1440, "height": 1000}, reduced_motion="reduce")
    p2 = rm.new_page()
    p2.goto(BASE + "/experience/universal-resonator", wait_until="networkidle")
    p2.wait_for_timeout(1500)
    m = p2.evaluate("""() => {
      const els = Array.from(document.querySelectorAll('[data-reveal]'));
      const hidden = els.filter(e => { const cs = getComputedStyle(e);
        return parseFloat(cs.opacity) < 1 || (cs.transform && cs.transform !== 'none'); });
      return {total: els.length, hidden: hidden.length};
    }""")
    check("reduced motion: every reveal wrapper is fully visible", m["hidden"] == 0, json.dumps(m))
    rm.close()
    browser.close()

with open(OUT, "w", encoding="utf-8") as fh:
    json.dump({"base": BASE, "checks": checks, "failed": failed, "screenshots": screens,
               "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())},
              fh, indent=2, ensure_ascii=False)
print(f"\nassertions passed: {len(checks) - len(failed)}")
print("assertions failed:", len(failed))
for f in failed:
    print("  -", f)
print("BATCH17_LIVE_" + ("PASSED" if not failed else "FAILED"))
sys.exit(1 if failed else 0)
