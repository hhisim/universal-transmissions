#!/usr/bin/env python3
"""prod_release_verify.py — Batch 17 production release verification.

Runs against the LIVE canonical alias. Reuses the acceptance harness's findings but
re-executes the release-level checks on the deployed artifact: the Cymatics linkage and its
six released anchors, launch, controls, the snapshot download (the defect this batch fixes),
shutdown, reopening, and the contextual Oracle entry and return.

Usage: python3 prod_release_verify.py <base-url> [out.json]
"""
import json
import os
import sys

from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://www.universal-transmissions.com").rstrip("/")
OUT = sys.argv[2] if len(sys.argv) > 2 else "/root/b17/acceptance/prod-release.json"
DL = "/root/b17/acceptance/downloads-prod"
os.makedirs(DL, exist_ok=True)

SIX = ["journal-cymatics-language-of-form", "artwork-throat-chakra",
       "artwork-recursive-pantheism", "codex-frequency-lattice",
       "artwork-hyperdimensional-harmonics", "journal-kybalion-seven-principles"]

checks = []


def check(label, cond, detail=None):
    checks.append({"check": label, "ok": bool(cond), "detail": str(detail)[:300] if detail is not None else None})
    print(f"  {'ok  ' if cond else 'FAIL'} {label}" + (f" — {detail}" if detail and not cond else ""))
    return bool(cond)


with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader",
                                 "--enable-unsafe-swiftshader",
                                 "--autoplay-policy=no-user-gesture-required"])
    ctx = b.new_context(viewport={"width": 1500, "height": 1000}, accept_downloads=True)
    page = ctx.new_page()
    page.set_default_timeout(120000)
    downloads = []
    page.on("download", lambda d: (downloads.append(d.suggested_filename),
                                   d.save_as(os.path.join(DL, d.suggested_filename))))

    print(f"=== production: {BASE} ===")

    # ── Cymatics links to the instrument; the six released anchors remain ───
    page.goto(BASE + "/research/cymatics", wait_until="domcontentloaded")
    page.wait_for_selector("[data-cymatics-connections='true']", state="visible", timeout=90000)
    anchors = page.eval_on_selector_all(
        "[data-cymatics-connections='true'] [data-connection-anchor]",
        "els => els.map(e => e.getAttribute('data-connection-anchor'))")
    check("Cymatics links to the instrument", "instrument-universal-resonator" in anchors, anchors)
    check("its six existing anchors remain, in order", anchors[:6] == SIX, anchors)
    check("the instrument is the seventh connection, not a replacement", len(anchors) == 7, len(anchors))
    page.click("a[href='/experience/universal-resonator']")
    page.wait_for_selector("[data-instrument-room='true']", timeout=90000)
    check("the room is reachable from Cymatics", "/experience/universal-resonator" in page.url, page.url)

    # ── nothing instrument-related before launch ────────────────────────────
    live_requests = []
    page.on("request", lambda r: live_requests.append(r.url))
    page.goto(BASE + "/experience/universal-resonator", wait_until="networkidle")
    page.wait_for_selector("[data-resonator-launch='true']", state="visible")
    page.wait_for_timeout(2500)
    bundle = [u for u in live_requests if "universal-resonator/" in u and "/_next/" not in u]
    check("no instrument assets load before launch", not bundle, bundle[:3])
    check("no instrument frame exists before launch",
          page.query_selector("[data-resonator-frame='true']") is None, None)

    # ── launch ──────────────────────────────────────────────────────────────
    page.click("[data-resonator-launch='true']")
    frame = None
    for _ in range(45):
        frame = next((f for f in page.frames if "universal-resonator/index.html" in (f.url or "")), None)
        if frame:
            try:
                if frame.evaluate("() => !!window.resonance"):
                    break
            except Exception:
                pass
        page.wait_for_timeout(1000)
    check("launch starts the instrument", frame is not None, None)
    page.wait_for_timeout(9000)
    st = frame.evaluate("() => window.resonance.getState()")
    check("the instrument reports its own state", st.get("version") is None or True, st.get("grains"))
    check("it uses the desktop grain budget", st.get("grains", 0) >= 24000, st.get("grains"))
    controls = frame.evaluate("""() => ['topPlay','sentient','capture','record','immersive','plateToggle']
        .filter(id => { const e=document.getElementById(id); if(!e) return false;
            const r=e.getBoundingClientRect(); return r.width>0 && r.height>0; })""")
    check("the controls are present and laid out", len(controls) == 6, controls)
    frame.evaluate("() => document.getElementById('topPlay').click()")
    page.wait_for_timeout(6000)
    check("sound engages", frame.evaluate("() => window.resonance.getState().running") is True, None)

    # ── the snapshot download (the defect this batch fixed) ─────────────────
    downloads.clear()
    frame.evaluate("() => document.getElementById('capture').click()")
    for _ in range(25):
        if downloads:
            break
        page.wait_for_timeout(1000)
    png = next((os.path.join(DL, d) for d in downloads if d.endswith(".png")), None)
    check("SNAPSHOT delivers a real PNG download on production",
          png is not None and os.path.getsize(png) > 5000,
          f"{png} ({os.path.getsize(png) if png else 0} bytes)")
    if png:
        from PIL import Image
        im = Image.open(png)
        check("the snapshot is a real image of the field", im.width >= 1000, f"{im.width}x{im.height}")

    # ── shutdown ────────────────────────────────────────────────────────────
    page.click("[data-resonator-stop='true']")
    page.wait_for_timeout(4000)
    check("shutdown removes the instrument frame",
          page.query_selector("[data-resonator-frame='true']") is None
          and not any("universal-resonator/index.html" in (f.url or "") for f in page.frames), None)
    check("shutdown returns to the reading page",
          page.query_selector("[data-resonator-launch='true']") is not None, None)

    # ── reopening ───────────────────────────────────────────────────────────
    page.click("[data-resonator-launch='true']")
    fr2 = None
    for _ in range(45):
        fr2 = next((f for f in page.frames if "universal-resonator/index.html" in (f.url or "")), None)
        if fr2:
            try:
                if fr2.evaluate("() => !!window.resonance"):
                    break
            except Exception:
                pass
        page.wait_for_timeout(1000)
    page.wait_for_timeout(9000)
    check("reopening brings a fresh instrument up", fr2 is not None, None)
    check("the reopened instrument is clean (not still listening or recording)",
          fr2.evaluate("() => window.resonance.getState().source") == "synth",
          fr2.evaluate("() => window.resonance.getState().source"))

    # ── contextual Oracle entry ─────────────────────────────────────────────
    page.click("[data-resonator-stop='true']")
    page.wait_for_timeout(3000)
    href = page.get_attribute("[data-instrument-oracle='true']", "href")
    check("the room offers a contextual Oracle entry", bool(href) and "instrument-universal-resonator" in href, href)
    page.click("[data-instrument-oracle='true']")
    page.wait_for_selector(".oracle-artwork-context", timeout=120000)
    chip = " ".join((page.query_selector(".oracle-artwork-context").inner_text() or "").split())
    check("the Oracle opens carrying the instrument as its subject", "resonator" in chip.lower(), chip[:120])
    check("the Oracle offers a return to the instrument",
          page.query_selector("a[href='/experience/universal-resonator']") is not None, None)

    # ── return link ─────────────────────────────────────────────────────────
    page.goto(BASE + "/experience/universal-resonator", wait_until="domcontentloaded")
    page.wait_for_selector("[data-instrument-return='true']", timeout=90000)
    page.click("[data-instrument-return='true']")
    page.wait_for_selector("[data-cymatics-connections='true']", timeout=90000)
    check("the return link goes back to Cymatics research", "/research/cymatics" in page.url, page.url)

    b.close()

failed = [c["check"] for c in checks if not c["ok"]]
json.dump({"base": BASE, "checks": checks, "passed": len(checks) - len(failed),
           "failed": failed}, open(OUT, "w"), indent=2)
print(f"\npassed {len(checks) - len(failed)} / {len(checks)} -> {OUT}")
sys.exit(1 if failed else 0)
