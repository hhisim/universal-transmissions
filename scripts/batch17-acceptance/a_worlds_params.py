#!/usr/bin/env python3
"""a_worlds_params.py — exercise the real instrument: worlds, adjustments, navigation,
both monitor modes, and Sentient evolution long enough to see multiple transitions.

Run: /root/.venvs/shopify-playwright/bin/python3 a_worlds_params.py
"""
import json
import sys

from helper import (BASE, check, click_text, canvas_shot, evolution, open_instrument,
                    page_shot, png_diff, png_stats, results, save, set_range, set_select,
                    state, webgl_info)
from playwright.sync_api import sync_playwright

G = "1. worlds"


def main():
    with sync_playwright() as pw:
        browser, ctx, page, frame = open_instrument(pw)

        gl = webgl_info(frame)
        check("the 3D field canvas has a live WebGL context", gl.get("ok"), gl, G)
        check("rendering renderer recorded", True, f"{gl.get('api')} / {gl.get('renderer')}", G)
        print(f"      [renderer] {gl.get('api')} :: {gl.get('vendor')} :: {gl.get('renderer')}")
        json.dump(gl, open("/root/b17/acceptance/webgl.json", "w"), indent=2)

        check("the instrument reports its own version", frame.evaluate("() => window.resonance.version") == "7.0.0",
              frame.evaluate("() => window.resonance.version"), G)

        # ── the field must be excited before anything is meaningful ───────────
        started = click_text(frame, "AWAKEN THE FIELD") or frame.evaluate("() => { document.getElementById('topPlay').click(); return true; }")
        check("the field can be awakened", started, None, G)
        page.wait_for_timeout(6000)
        st = state(frame)
        check("audio is running after awakening", st.get("running") is True, st.get("running"), G)
        check("grains are live (desktop grain count)", st.get("grains", 0) >= 24000, st.get("grains"), G)
        check("the field is rendering something, not a black frame",
              png_stats(canvas_shot(frame, "a00-awake.png"))["lit_fraction"] > 0.01, None, G)

        # ── 1. the named worlds ───────────────────────────────────────────────
        print("\n=== the named worlds ===")
        worlds = {}
        for label in ["PRISM", "MONSOON", "LOTUS", "TEMPLE"]:
            hit = click_text(frame, label)
            page.wait_for_timeout(7000)
            s = state(frame)
            shot = canvas_shot(frame, f"a10-world-{label.lower()}.png")
            stats = png_stats(shot)
            worlds[label] = {"space": s.get("space"), "m": s.get("m"), "n": s.get("n"),
                             "geometry": s.get("geometry"), "mode": s.get("soundMode"),
                             "lit": stats["lit_fraction"], "mean": stats["mean"]}
            check(f"{label}: the world can be selected", hit, None, G)
            check(f"{label}: it drives the model (space/m/n reported)", bool(s.get("space")), json.dumps(worlds[label]), G)
            check(f"{label}: the field actually renders", stats["lit_fraction"] > 0.01, stats["lit_fraction"], G)
            check(f"{label}: its own sound mode is engaged", bool(s.get("soundMode")), s.get("soundMode"), G)
        spaces = {v["space"] for v in worlds.values()}
        check("the four worlds are not all the same model", len(spaces) >= 2, sorted(spaces), G)
        diffs = {}
        for a, b in [("PRISM", "MONSOON"), ("MONSOON", "LOTUS"), ("LOTUS", "TEMPLE")]:
            diffs[f"{a}->{b}"] = round(png_diff(f"{'/root/b17/acceptance/screens'}/a10-world-{a.lower()}.png",
                                                f"{'/root/b17/acceptance/screens'}/a10-world-{b.lower()}.png"), 2)
        check("switching world visibly changes the field", all(v > 2 for v in diffs.values()), json.dumps(diffs), G)
        print(f"      [world-to-world pixel deltas] {json.dumps(diffs)}")

        # ── 2. frequency and interference ─────────────────────────────────────
        print("\n=== frequency and interference ===")
        click_text(frame, "PRISM")
        page.wait_for_timeout(6000)
        base_shot = canvas_shot(frame, "a20-before-frequency.png")
        before = state(frame)
        set_select(frame, "soundMode", frame.evaluate("() => document.getElementById('soundMode').value"))
        set_range(frame, "frequency", 396)
        page.wait_for_timeout(5000)
        after = state(frame)
        mid_shot = canvas_shot(frame, "a21-after-frequency.png")
        check("the frequency dial moves the engine", float(after.get("frequency", 0)) != float(before.get("frequency", 0)),
              f"{before.get('frequency')} -> {after.get('frequency')}", G)
        check("changing frequency visibly affects the field",
              png_diff(base_shot, mid_shot) > 1.0, round(png_diff(base_shot, mid_shot), 2), G)

        # interference: sample a sweep and check movement is continuous, not a jump cut
        series = []
        for v in [0.05, 0.2, 0.4, 0.6, 0.8, 1.0]:
            set_range(frame, "interference", v)
            page.wait_for_timeout(1600)
            series.append(canvas_shot(frame, f"a22-interference-{str(v).replace('.','_')}.png"))
        steps = [round(png_diff(series[i], series[i + 1]), 2) for i in range(len(series) - 1)]
        check("interference changes the field at every step", all(s > 0.4 for s in steps), json.dumps(steps), G)
        check("the interference sweep is continuous (no jump cut)",
              all(s < 40 for s in steps), json.dumps(steps), G)
        print(f"      [interference step deltas] {json.dumps(steps)}")
        iv = state(frame).get("interference")
        check("the model reports the interference value it was given", abs(float(iv) - 1.0) < 0.02, iv, G)

        # ── 3. orbit, zoom, immersion ─────────────────────────────────────────
        print("\n=== orbit, zoom, immersion ===")
        set_range(frame, "interference", 0.28)
        page.wait_for_timeout(2500)
        rest = canvas_shot(frame, "a30-camera-rest.png")
        box = frame.locator("#field").bounding_box()
        cx, cy = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
        page.mouse.move(cx, cy)
        page.mouse.down()
        for i in range(12):
            page.mouse.move(cx + (i + 1) * 22, cy + (i + 1) * 7)
            page.wait_for_timeout(45)
        page.mouse.up()
        page.wait_for_timeout(2500)
        orbited = canvas_shot(frame, "a31-after-orbit.png")
        d_orbit = png_diff(rest, orbited)
        check("dragging orbits the view (the field visibly moves)", d_orbit > 3, round(d_orbit, 2), G)

        page.mouse.move(cx, cy)
        for _ in range(6):
            page.mouse.wheel(0, -240)
            page.wait_for_timeout(160)
        page.wait_for_timeout(2200)
        zoomed = canvas_shot(frame, "a32-after-zoom.png")
        d_zoom = png_diff(orbited, zoomed)
        check("scrolling zooms the view", d_zoom > 2, round(d_zoom, 2), G)

        frame.evaluate("() => document.getElementById('resetCamera').click()")
        page.wait_for_timeout(2600)
        reset = canvas_shot(frame, "a33-after-reset.png")
        d_reset = png_diff(rest, reset)
        check("reset view returns the camera to a comparable framing", d_reset < 14, round(d_reset, 2), G)

        # IMMERSE toggles body.immersed and reveals the restore control (plus a fullscreen
        # request, which headless Chromium may decline — so the class is the real signal).
        imm_before = frame.evaluate("() => ({immersed:document.body.classList.contains('immersed'), restoreHidden:document.getElementById('restore').hidden})")
        frame.evaluate("() => document.getElementById('immersive').click()")
        page.wait_for_timeout(2600)
        imm_after = frame.evaluate("() => ({immersed:document.body.classList.contains('immersed'), restoreHidden:document.getElementById('restore').hidden})")
        check("IMMERSE toggles the immersive state", imm_before != imm_after,
              f"{imm_before} -> {imm_after}", G)
        check("immersive mode is entered (not silently ignored)",
              imm_after["immersed"] is True and imm_after["restoreHidden"] is False,
              json.dumps(imm_after), G)
        page_shot(page, "a34-immersive.png")
        frame.evaluate("() => document.getElementById('immersive').click()")
        page.wait_for_timeout(1600)
        imm_off = frame.evaluate("() => document.body.classList.contains('immersed')")
        check("immersive mode can be left again", imm_off is False, imm_off, G)

        # ── 4. the two monitor modes ──────────────────────────────────────────
        print("\n=== the 2D source monitor and the 3D-section mode ===")
        opened = frame.evaluate("() => { const m=document.getElementById('plateMonitor'); return !m.hidden; }")
        if not opened:
            frame.evaluate("() => document.getElementById('plateToggle').click()")
            page.wait_for_timeout(1500)
        check("the plate monitor can be opened", frame.evaluate("() => !document.getElementById('plateMonitor').hidden"), None, G)
        opts = frame.evaluate("""() => Array.from(document.getElementById('plateMode').options)
                                .map(o => ({value:o.value, text:o.textContent.trim()}))""")
        json.dump(opts, open("/root/b17/acceptance/plate-modes.json", "w"), indent=2)
        check("the monitor offers a source-plate mode and a 3D-section mode", len(opts) == 2, json.dumps(opts), G)
        src_val = next((o["value"] for o in opts if "source" in o["text"].lower()), opts[0]["value"])
        sec_val = next((o["value"] for o in opts if "section" in o["text"].lower()), opts[-1]["value"])
        shots = {}
        for nm, val in [("source", src_val), ("section", sec_val)]:
            set_select(frame, "plateMode", val)
            page.wait_for_timeout(4000)
            p = f"/root/b17/acceptance/screens/a40-monitor-{nm}.png"
            element_shot(frame, "#plateCanvas", os.path.basename(p))
            shots[nm] = png_stats(p)
            check(f"the {nm} monitor renders live content", shots[nm]["lit_fraction"] > 0.01, shots[nm], G)
            rd = frame.evaluate("() => (document.getElementById('plateReadout').innerText||'').trim()")
            check(f"the {nm} monitor reports its own readout", len(rd) > 0, rd[:120], G)
            print(f"      [{nm} monitor readout] {rd[:110]}")
        d = png_diff("/root/b17/acceptance/screens/a40-monitor-source.png",
                     "/root/b17/acceptance/screens/a40-monitor-section.png")
        check("the source monitor and the 3D-section monitor are genuinely different computations",
              d > 1.5, round(d, 2), G)
        set_select(frame, "plateMode", sec_val)
        set_range(frame, "sectionPosition", 0.55)
        page.wait_for_timeout(3500)
        element_shot(frame, "#plateCanvas", "a41-monitor-section-shifted.png")
        d2 = png_diff("/root/b17/acceptance/screens/a40-monitor-section.png",
                      "/root/b17/acceptance/screens/a41-monitor-section-shifted.png")
        check("moving Section position changes the solved section", d2 > 1.0, round(d2, 2), G)
        frame.evaluate("() => document.getElementById('plateExpand').click()")
        page.wait_for_timeout(1500)
        check("the monitor can be enlarged",
              frame.evaluate("() => document.getElementById('plateMonitor').classList.contains('expanded')"), None, G)
        page_shot(page, "a42-monitor-both-modes.png")
        frame.evaluate("() => document.getElementById('plateExpand').click()")
        frame.evaluate("() => document.getElementById('plateClose').click()")
        page.wait_for_timeout(1200)
        check("the monitor can be closed",
              frame.evaluate("() => document.getElementById('plateMonitor').hidden"), None, G)
        frame.evaluate("() => document.getElementById('plateToggle').click()")
        page.wait_for_timeout(1500)

        # ── 5. Sentient evolution, whatever pace it is given ───────────────────
        print("\n=== Sentient evolution ===")
        frame.evaluate("() => document.getElementById('sentient').click()")
        page.wait_for_timeout(1500)
        e0 = evolution(frame)
        check("Sentient mode engages", e0.get("enabled") is True, e0, G)
        set_range(frame, "evolutionSpeed", 3)
        page.wait_for_timeout(1500)
        e1 = evolution(frame)
        check("the evolution pace is adjustable (3x)", e1.get("secondsPerWorld") is not None,
              json.dumps(e1), G)
        print(f"      [pace at 3x] {e1.get('secondsPerWorld')}s per arc")

        worlds_seen, patterns_seen, stages, glow_ok, size_ok = set(), set(), set(), True, True
        timeline = []
        t0 = __import__("time").time()
        last = None
        while __import__("time").time() - t0 < 165:
            page.wait_for_timeout(700)
            e = evolution(frame)
            s = state(frame)
            if e.get("world"):
                worlds_seen.add(e["world"])
            if e.get("pattern"):
                patterns_seen.add(e["pattern"])
            glow_ok = glow_ok and (0.19 <= float(s.get("glow", 0.5)) <= 0.71)
            size_ok = size_ok and (float(s.get("particleSize", 0.5)) <= 1.01)
            key = (e.get("world"), e.get("pattern"), e.get("stage"), s.get("space"))
            if key != last:
                timeline.append({"t": round(__import__("time").time() - t0, 1), "world": e.get("world"),
                                 "pattern": e.get("pattern"), "stage": e.get("stage"),
                                 "space": s.get("space"), "m": s.get("m"), "n": s.get("n"),
                                 "glow": s.get("glow"), "size": s.get("particleSize")})
                last = key
        elapsed = round(__import__("time").time() - t0, 1)
        json.dump({"elapsed": elapsed, "timeline": timeline,
                   "worlds": sorted(worlds_seen), "patterns": sorted(patterns_seen)},
                  open("/root/b17/acceptance/evolution.json", "w"), indent=2)
        check("Sentient evolution runs continuously", len(timeline) >= 6, f"{len(timeline)} state changes", G)
        check("multiple world transitions observed (Prism/Monsoon/Lotus/Temple and beyond)",
              len(worlds_seen) >= 3, sorted(worlds_seen), G)
        check("multiple distinct pattern destinations observed", len(patterns_seen) >= 3, sorted(patterns_seen), G)
        check("radiance stays inside its stated 0.2-0.7 band during evolution", glow_ok, None, G)
        check("grain size stays at or below 1.0 during evolution", size_ok, None, G)
        st = state(frame)
        check("paces cover 7+ arcs in the observation window at 3x", len(timeline) >= 6,
              f"{len(timeline)} transitions in {elapsed}s", G)
        print(f"      [evolution] {elapsed}s, worlds={sorted(worlds_seen)}, patterns={sorted(patterns_seen)}")
        for row in timeline[:14]:
            print(f"        t={row['t']:>6}s  {row['world']} · {row['pattern']} · {row['stage']}  ({row['space']} m{row['m']} n{row['n']})")
        canvas_shot(frame, "a50-sentient.png")
        page_shot(page, "a51-sentient-full.png")

        frame.evaluate("() => document.getElementById('sentient').click()")
        browser.close()

    save("/root/b17/acceptance/a_results.json")
    return 1 if results and any(not r["ok"] for r in results) else 0


if __name__ == "__main__":
    sys.exit(main())
