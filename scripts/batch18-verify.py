#!/usr/bin/env python3
"""batch18-verify.py — Batch 18 journeys and states, run identically per work.

Walks discovery -> artwork preview -> detail inspection -> explained connection ->
contextual Oracle -> return, then the states the brief names: keyboard access, 390 CSS px,
slow network, image failure, and whether the artwork is still the visual focus.

The loading claims are asserted on OBSERVED REQUESTS, not on intent: a "preview" that
actually fetches the master is a failure here, and so is a preview that never arrives.

Usage: python3 batch18-verify.py <base> [slug ...]
"""
import json
import os
import sys

from urllib.parse import unquote

from playwright.sync_api import sync_playwright

BASE = sys.argv[1].rstrip("/")
SLUGS = sys.argv[2:] or ["vitruvian-spirit", "tetra", "merkaba", "cosmic-egg"]
OUT = os.environ.get("B18_OUT", "/root/b18/verify.json")
SHOTS = "/root/b18/screens"
os.makedirs(SHOTS, exist_ok=True)

checks = []


def check(label, cond, detail=None):
    checks.append({"check": label, "ok": bool(cond),
                   "detail": str(detail)[:400] if detail is not None else None})
    print(f"  {'ok  ' if cond else 'FAIL'} {label}" + (f" — {detail}" if detail and not cond else ""))
    return bool(cond)


results = {}
with sync_playwright() as pw:
    browser = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader",
                                       "--enable-unsafe-swiftshader"])
    for slug in SLUGS:
        checks = []
        print(f"\n=== {slug} on {BASE} ===")
        ctx = browser.new_context(viewport={"width": 1440, "height": 950})
        page = ctx.new_page()
        page.set_default_timeout(90000)
        reqs = []
        page.on("request", lambda r: reqs.append(r.url))

        # ── discovery ───────────────────────────────────────────────────────
        page.goto(f"{BASE}/gallery", wait_until="domcontentloaded")
        page.wait_for_timeout(1500)
        card = page.query_selector(f"a[href='/gallery/{slug}']")
        check("discovery: the gallery indexes this work", card is not None, None)

        # ── artwork preview ─────────────────────────────────────────────────
        reqs.clear()
        page.goto(f"{BASE}/gallery/{slug}", wait_until="domcontentloaded")
        page.wait_for_selector("[data-artwork-hero='true']", timeout=60000)
        page.wait_for_timeout(6000)

        hero = page.query_selector("[data-artwork-hero='true']")
        state = hero.get_attribute("data-hero-state")
        check("preview: the hero starts in preview state", state == "preview", state)

        master_path = f"/artworks/{slug}/main.jpg"
        master_reqs = [u for u in reqs if master_path in u and "/_next/image" not in u]
        optimized = [u for u in reqs if "/_next/image" in u and "main.jpg" in u]
        check("preview: an optimised derivative is requested", len(optimized) >= 1, optimized[:1])
        check("preview: the MASTER is NOT fetched on load", not master_reqs, master_reqs[:1])

        box = page.evaluate("""() => {
            const f = document.querySelector('[data-hero-frame="true"]');
            if (!f) return null;
            const r = f.getBoundingClientRect();
            const img = f.querySelector('img');
            return { w: Math.round(r.width), h: Math.round(r.height),
                     ratio: +(r.width / r.height).toFixed(3),
                     fit: img ? getComputedStyle(img).objectFit : null,
                     natural: img ? [img.naturalWidth, img.naturalHeight] : null };
        }""")
        import re as _re
        meta = open("/root/ut-repo/src/data/artwork-image-meta.ts").read()
        m = _re.search(rf'"{slug}": \{{ width: (\d+), height: (\d+) \}}', meta)
        want = round(int(m.group(1)) / int(m.group(2)), 3) if m else None
        check("preview: the box takes the master's own aspect (no crop)",
              box and want and abs(box["ratio"] - want) < 0.03, f"{box and box['ratio']} vs {want}")
        check("preview: the image is contained, not cropped to fill",
              box and box["fit"] == "contain", box and box["fit"])

        # ── artwork remains the visual focus ────────────────────────────────
        focus = page.evaluate("""() => {
            const f = document.querySelector('[data-hero-frame="true"]');
            if (!f) return null;
            const r = f.getBoundingClientRect();
            return +(Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) / innerHeight;
        }""")
        check("focus: the artwork dominates the first viewport", focus and focus >= 0.4, focus)

        # ── detail inspection (the master, on demand) ───────────────────────
        reqs.clear()
        page.click("[data-hero-inspect='true']")
        page.wait_for_selector("[role='dialog']", timeout=60000)
        page.wait_for_timeout(5000)
        now_master = [u for u in reqs if master_path in u and "/_next/image" not in u]
        check("inspection: opening it requests the full-resolution master", len(now_master) >= 1, now_master[:1])
        check("inspection: zoom controls are offered",
              page.query_selector("[data-lightbox-zoom='true']") is not None, None)
        page.keyboard.press("Escape")
        page.wait_for_timeout(1200)
        check("inspection: Escape closes and returns to the artwork",
              page.query_selector("[role='dialog']") is None
              and page.query_selector("[data-artwork-hero='true']") is not None, None)

        # ── explained connection ────────────────────────────────────────────
        conns = page.eval_on_selector_all("[data-artwork-connection]",
                                          """els => els.map(e => ({
                                              anchor: e.getAttribute('data-artwork-connection'),
                                              kind: (e.querySelector('[data-connection-kind]')||{}).textContent,
                                              basis: e.getAttribute ? (e.querySelector('[data-connection-basis]')||{}).textContent : null }))""")
        check("connections: the work names the archive records that belong to it",
              len(conns) >= 1, f"{len(conns)} connections")
        if conns:
            body = page.eval_on_selector_all("[data-artwork-connection]",
                                             "els => els.map(e => e.innerText).join('\\n')")
            check("connections: each states why it belongs, not just a link",
                  body.count("→") >= len(conns) and len(body) > 60 * len(conns), f"{len(conns)} cards")
            check("connections: the basis of each claim is labelled",
                  all(c["basis"] and c["basis"].strip() for c in conns), conns[:2])

        # ── contextual Oracle + return ──────────────────────────────────────
        href = page.get_attribute("[data-artwork-oracle='true']", "href")
        # The return path is percent-encoded inside the query string, so it has to be
        # compared decoded - matching the raw href reports a missing return path that is
        # plainly there.
        dhref = unquote(href or "")
        check("oracle: the entry names the work and where to return to",
              "artworkId=" in dhref and f"/gallery/{slug}" in dhref, dhref)
        page.goto(BASE + href, wait_until="domcontentloaded")
        page.wait_for_timeout(4000)
        ret = page.query_selector(f"a[href='/gallery/{slug}']")
        check("oracle: the surrounding page offers a route back to the work", ret is not None, None)
        back = page.query_selector("text=RETURN TO ARTWORK")
        check("oracle: a return control is present", back is not None, None)

        page.screenshot(path=os.path.join(SHOTS, f"b18-{slug}-desktop.png"))

        # ── 390 CSS px ──────────────────────────────────────────────────────
        ctx2 = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=3,
                                   is_mobile=True, has_touch=True)
        p2 = ctx2.new_page()
        p2.set_default_timeout(90000)
        p2.goto(f"{BASE}/gallery/{slug}", wait_until="domcontentloaded")
        p2.wait_for_selector("[data-artwork-hero='true']", timeout=60000)
        p2.wait_for_timeout(4000)
        m390 = p2.evaluate("""() => ({
            inner: innerWidth,
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
            heroFits: (() => { const f=document.querySelector('[data-hero-frame="true"]');
                               if(!f) return null; const r=f.getBoundingClientRect();
                               return r.left >= -1 && r.right <= innerWidth + 1; })(),
            focus: (() => { const f=document.querySelector('[data-hero-frame="true"]');
                            if(!f) return 0; const r=f.getBoundingClientRect();
                            return +(Math.min(r.bottom, innerHeight) - Math.max(r.top,0)) / innerHeight; })(),
            inspectTappable: (() => { const b=document.querySelector('[data-hero-inspect="true"]');
                              if(!b) return null; const r=b.getBoundingClientRect();
                              return r.height >= 40 && r.left >= -1 && r.right <= innerWidth + 1; })(),
        })""")
        check("390: a real 390 CSS px viewport", m390["inner"] == 390, m390["inner"])
        check("390: no horizontal overflow", not m390["overflow"], None)
        check("390: the hero fits the viewport", m390["heroFits"], None)
        check("390: the artwork still dominates the first screen", m390["focus"] >= 0.3, m390["focus"])
        check("390: the inspection control is tappable", m390["inspectTappable"], None)
        p2.screenshot(path=os.path.join(SHOTS, f"b18-{slug}-390.png"))
        ctx2.close()

        # ── slow network: the preview must not wait on the master ───────────
        ctx3 = browser.new_context(viewport={"width": 1280, "height": 900})
        p3 = ctx3.new_page()
        p3.set_default_timeout(120000)
        slow = []
        p3.on("request", lambda r: slow.append(r.url))
        cdp = ctx3.new_cdp_session(p3)
        cdp.send("Network.enable")
        cdp.send("Network.emulateNetworkConditions", {
            "offline": False, "latency": 400,
            "downloadThroughput": int(400 * 1024 / 8), "uploadThroughput": int(200 * 1024 / 8)})
        p3.goto(f"{BASE}/gallery/{slug}", wait_until="domcontentloaded")
        p3.wait_for_selector("[data-artwork-hero='true']", timeout=120000)
        # the preview must become visible while the connection is still slow
        shown = False
        for _ in range(40):
            shown = p3.evaluate("""() => {
                const img = document.querySelector('[data-hero-frame="true"] img');
                return !!(img && img.complete && img.naturalWidth > 0); }""")
            if shown:
                break
            p3.wait_for_timeout(500)
        check("slow network: the preview becomes visible without the master", shown, None)
        check("slow network: the master is still not requested",
              not [u for u in slow if master_path in u and "/_next/image" not in u],
              [u for u in slow if master_path in u][:1])
        ctx3.close()

        # ── image failure ───────────────────────────────────────────────────
        ctx4 = browser.new_context(viewport={"width": 1280, "height": 900})
        p4 = ctx4.new_page()
        p4.set_default_timeout(60000)
        p4.route("**/_next/image**", lambda route: route.abort())
        p4.goto(f"{BASE}/gallery/{slug}", wait_until="domcontentloaded")
        p4.wait_for_selector("[data-artwork-hero='true']", timeout=60000)
        failed = False
        for _ in range(20):
            failed = p4.query_selector("[data-hero-error='true']") is not None
            if failed:
                break
            p4.wait_for_timeout(500)
        check("failure: a blocked preview says so instead of showing a broken image",
              failed, None)
        check("failure: the rest of the page still renders",
              p4.query_selector("[data-artwork-oracle='true']") is not None, None)
        ctx4.close()

        results[slug] = {
            "checks": checks,
            "passed": sum(1 for c in checks if c["ok"]),
            "total": len(checks),
            "failed": [c["check"] for c in checks if not c["ok"]],
        }
        ctx.close()
    browser.close()

os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump({"base": BASE, "works": results}, open(OUT, "w"), indent=2)
total = sum(r["total"] for r in results.values())
passed = sum(r["passed"] for r in results.values())
print(f"\n=== TOTAL: {passed} / {total} ===")
for k, v in results.items():
    print(f"  {k:20s} {v['passed']}/{v['total']}" + (f"  failed: {v['failed']}" if v["failed"] else ""))
print(f"written: {OUT}")
sys.exit(1 if passed != total else 0)
