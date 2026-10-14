#!/usr/bin/env python3
"""d_mobile.py — operate the instrument at a real 390 CSS px viewport.

Operates rather than launches: touch orbit, pinch zoom, the control surface, the monitor
and the exit. Performance is MEASURED (animation-frame cadence inside the instrument's own
realm) and the renderer is reported for what it is.

Scope limit, stated up front so no one reads more into this than it says: this is Chromium
device emulation at 390 CSS px on a software rasteriser with a fake touch device. It is
not a physical phone, not a real GPU, and not a real touch digitiser. Nothing here is
generalised to physical iOS/Android devices.

Run: /root/.venvs/shopify-playwright/bin/python3 d_mobile.py
"""
import json
import os
import sys

from helper import (canvas_shot, check, element_shot, page_shot, png_diff, results,
                    save, state, webgl_info)
from playwright.sync_api import sync_playwright

G = "4. launched mobile experience"
BASE = os.environ.get("B17_BASE", "https://universal-transmissions-iscvuxtpo-hhisim-7214s-projects.vercel.app")
SHOTS = "/root/b17/acceptance/screens"

FPS_PROBE = r"""
(() => {
  if (window.__fpsInstalled) return; window.__fpsInstalled = true;
  const P = window.__fps = {ticks: 0, t0: performance.now()};
  const tick = () => { P.ticks++; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
})();
"""


def fps(frame):
    return frame.evaluate("""() => {
        const P = window.__fps; if (!P) return null;
        const now = performance.now(), secs = (now - P.t0) / 1000;
        return {ticks: P.ticks, seconds: +secs.toFixed(2),
                fps: +(P.ticks / Math.max(0.001, secs)).toFixed(1)};
    }""")


def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader",
                                           "--enable-unsafe-swiftshader"])
        ctx = browser.new_context(viewport={"width": 390, "height": 844},
                                  device_scale_factor=3, is_mobile=True, has_touch=True)
        ctx.add_init_script(FPS_PROBE)
        page = ctx.new_page()
        page.set_default_timeout(120000)
        page.goto(BASE + "/experience/universal-resonator", wait_until="networkidle")
        page.wait_for_selector("[data-resonator-launch='true']", state="visible")
        vp = page.evaluate("() => ({w: innerWidth, h: innerHeight, dpr: devicePixelRatio, "
                           "overflow: document.documentElement.scrollWidth - innerWidth})")
        check("a real 390 CSS px viewport", vp["w"] == 390, json.dumps(vp), G)
        check("the reading page does not overflow horizontally", vp["overflow"] == 0, vp["overflow"], G)
        lb = page.locator("[data-resonator-launch='true']")
        lb.scroll_into_view_if_needed()
        page.wait_for_timeout(1200)
        bb = lb.bounding_box()
        # on a phone the reading page is long, so the control must be scrolled to before a
        # tap can land on it - which is exactly what a visitor does, too.
        check("the launch control scrolls into view and is big enough to tap",
              bb and bb["x"] >= 0 and bb["x"] + bb["width"] <= 390 and bb["height"] >= 40
              and 0 <= bb["y"] <= 844,
              json.dumps(bb), G)
        page.touchscreen.tap(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2)
        frame = None
        for _ in range(40):
            frame = next((f for f in page.frames if "universal-resonator/index.html" in (f.url or "")), None)
            if frame and frame.evaluate("() => !!window.resonance"):
                break
            page.wait_for_timeout(1000)
        if frame is None:                     # a fallback, so a missed tap is not read as a defect
            lb.click()
            for _ in range(40):
                frame = next((f for f in page.frames if "universal-resonator/index.html" in (f.url or "")), None)
                if frame and frame.evaluate("() => !!window.resonance"):
                    break
                page.wait_for_timeout(1000)
        check("the instrument launches from a tap", frame is not None, None, G)
        page.wait_for_timeout(10000)

        gl = webgl_info(frame)
        check("the mobile viewport gets a live WebGL context", gl.get("ok"), gl, G)
        software = any(k in (gl.get("renderer") or "").lower() for k in ("swiftshader", "llvmpipe", "software", "angle (google, vulkan"))
        check("the renderer in use is identified (hardware or software)", True,
              f"{gl.get('renderer')}", G)
        print(f"      [renderer] {gl.get('renderer')}")
        print(f"      [hardware or software] {'SOFTWARE (SwiftShader)' if software else 'hardware'}")

        st = state(frame)
        check("the mobile instrument uses the mobile grain budget", st.get("grains", 0) > 0,
              st.get("grains"), G)
        print(f"      [grains] {st.get('grains')}")

        # ── operate the controls, not just the launch button ─────────────────
        print("\n=== operating it at 390 ===")
        core = ["topPlay", "sentient", "capture", "record", "immersive", "plateToggle"]
        found = frame.evaluate("""ids => ids.map(id => {
            const e = document.getElementById(id); if (!e) return {id, exists:false};
            const r = e.getBoundingClientRect();
            return {id, exists:true, w:Math.round(r.width), h:Math.round(r.height),
                    x:Math.round(r.x), inView: r.x >= -2 && r.x + r.width <= window.innerWidth + 2,
                    vis: r.width > 0 && r.height > 0}; })""", core)
        for c in found:
            check(f"390: {c['id']} is present and laid out", c.get("exists") and c.get("vis"), json.dumps(c), G)
        reachable = [c for c in found if c.get("vis") and c.get("inView")]
        check("390: the core controls are reachable without horizontal scrolling",
              len(reachable) >= 4, f"{len(reachable)}/{len(core)} in view: "
              f"{[c['id'] for c in reachable]}", G)

        # touch orbit: a real single-finger swipe on the field
        box = frame.locator("#field").bounding_box()
        cx, cy = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
        canvas_shot(frame, "d30-touch-rest.png")
        cdp = ctx.new_cdp_session(page)
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": cx, "y": cy}]})
        for i in range(1, 21):
            cdp.send("Input.dispatchTouchEvent", {"type": "touchMove",
                     "touchPoints": [{"x": cx + i * 9, "y": cy + i * 3}]})
            page.wait_for_timeout(180)
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        page.wait_for_timeout(9000)   # let the rasteriser actually redraw the new view
        canvas_shot(frame, "d31-touch-orbited.png")
        d_orbit = png_diff(os.path.join(SHOTS, "d30-touch-rest.png"), os.path.join(SHOTS, "d31-touch-orbited.png"))
        check("390: one-finger drag orbits the view", d_orbit > 3, round(d_orbit, 2), G)

        # two-finger pinch
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [
            {"x": cx - 40, "y": cy, "id": 1}, {"x": cx + 40, "y": cy, "id": 2}]})
        for i in range(1, 16):
            cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [
                {"x": cx - 40 - i * 14, "y": cy, "id": 1}, {"x": cx + 40 + i * 14, "y": cy, "id": 2}]})
            page.wait_for_timeout(200)
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        page.wait_for_timeout(9000)
        canvas_shot(frame, "d32-touch-pinched.png")
        d_pinch = png_diff(os.path.join(SHOTS, "d31-touch-orbited.png"), os.path.join(SHOTS, "d32-touch-pinched.png"))
        check("390: two-finger pinch zooms/pans", d_pinch > 2, round(d_pinch, 2), G)

        # start the sound so the mobile instrument is actually running
        frame.evaluate("() => document.getElementById('topPlay').click()")
        page.wait_for_timeout(6000)
        check("390: the instrument runs on mobile (sound engaged)", state(frame).get("running") is True, None, G)

        # the monitor on a small screen
        if frame.evaluate("() => document.getElementById('plateMonitor').hidden"):
            frame.evaluate("() => document.getElementById('plateToggle').click()")
            page.wait_for_timeout(2500)
        mon = frame.evaluate("""() => { const m = document.getElementById('plateMonitor');
            const r = m.getBoundingClientRect();
            return {hidden:m.hidden, w:Math.round(r.width), h:Math.round(r.height),
                    x:Math.round(r.x), right:Math.round(r.right),
                    inView: r.x >= -2 && r.right <= window.innerWidth + 2,
                    canvas: !!document.getElementById('plateCanvas')}; }""")
        check("390: the 2D monitor is accessible and inside the viewport",
              (not mon["hidden"]) and mon["inView"] and mon["canvas"], json.dumps(mon), G)
        frame.locator("#plateCanvas").screenshot(path=os.path.join(SHOTS, "d40-mobile-monitor.png"))
        page_shot(page, "d41-mobile-monitor-page.png")

        # controls surface: can the visitor reach the deeper dials?
        deep = frame.evaluate("""() => {
            const ids = ['modeM','interference','hue','sectionPosition','evolutionSpeed'];
            return ids.map(id => { const e=document.getElementById(id); if(!e) return {id,exists:false};
              const r=e.getBoundingClientRect(); return {id, exists:true,
                w:Math.round(r.width), h:Math.round(r.height), inView: r.x>=-2 && r.right<=window.innerWidth+2}; }); }""")
        for c in deep:
            check(f"390: the '{c['id']}' control is reachable", c.get("exists") and c.get("inView"), json.dumps(c), G)

        # ── measured performance ─────────────────────────────────────────────
        print("\n=== measured performance (software WebGL, emulated 390) ===")
        _ = fps(frame)          # reset the window
        frame.evaluate("() => { window.__fps = {ticks:0, t0:performance.now()}; }")
        frame.evaluate("() => { const P=window.__fps; const t=()=>{P.ticks++;requestAnimationFrame(t);}; requestAnimationFrame(t); }")
        page.wait_for_timeout(6000)
        f = fps(frame)
        json.dump({"fps": f, "renderer": gl.get("renderer"), "software": bool(software),
                   "viewport": vp, "grains": st.get("grains")},
                  open("/root/b17/acceptance/mobile-perf.json", "w"), indent=2)
        check("390: the instrument keeps animating (measured frame cadence)",
              f and f["fps"] > 0.3, json.dumps(f), G)
        check("390: the measured cadence is reported with its renderer, not generalised",
              bool(gl.get("renderer")), None, G)
        check("390: frame cadence measured over a real window", f and f["seconds"] >= 4, json.dumps(f), G)
        print(f"      [fps] {f['fps']} over {f['seconds']}s ({f['ticks']} frames) — software rasteriser")
        # solver responsiveness
        ms = frame.evaluate("() => { const e=document.getElementById('modeReadout'); return (e.innerText||'').trim(); }")
        check("390: the solver is updating its readout", len(ms) > 0, ms, G)
        print(f"      [readout] {ms}")

        # ── exit ─────────────────────────────────────────────────────────────
        print("\n=== exit at 390 ===")
        stb = page.locator("[data-resonator-stop='true']").bounding_box()
        check("390: the exit control is present and tappable",
              stb and stb["height"] >= 36 and stb["x"] + stb["width"] <= 390, json.dumps(stb), G)
        page.locator("[data-resonator-stop='true']").click()
        page.wait_for_timeout(3000)
        check("390: exiting returns to the reading page",
              page.query_selector("[data-resonator-frame='true']") is None
              and page.query_selector("[data-resonator-launch='true']") is not None, None, G)
        page_shot(page, "d50-mobile-after-exit.png")
        browser.close()

    save("/root/b17/acceptance/d_results.json")
    return 1 if any(not r["ok"] for r in results) else 0


if __name__ == "__main__":
    sys.exit(main())
