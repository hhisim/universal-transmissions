"""helper.py — shared harness for the Batch 17 instrument acceptance.

The instrument exposes `window.resonance` (getState / getEvolution / version), so the
checks below assert against the engine's OWN reported state rather than guessing from
text. Pixel work is done on real screenshots of the 3D canvas, taken at the compositor,
because a WebGL canvas without preserveDrawingBuffer reads back blank.
"""
import json
import os
import time

import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

BASE = os.environ.get("B17_BASE", "https://universal-transmissions-iscvuxtpo-hhisim-7214s-projects.vercel.app")
SHOTS = "/root/b17/acceptance/screens"
os.makedirs(SHOTS, exist_ok=True)

# Software WebGL is the honest default here: this VPS has no GPU. --enable-unsafe-swiftshader
# keeps Chromium from refusing to serve a context at all, and the renderer string is
# recorded in the evidence so nobody mistakes emulation for hardware.
SWIFT = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
FAKE_MIC = ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream",
            "--autoplay-policy=no-user-gesture-required"]

results = []


def check(label, cond, detail=None, group=None):
    entry = {"check": label, "ok": bool(cond), "group": group}
    if detail is not None:
        entry["detail"] = str(detail)[:400]
    results.append(entry)
    print(f"  {'ok  ' if cond else 'FAIL'} {label}" + (f" — {detail}" if detail and not cond else ""))
    return bool(cond)


def save(path):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump({"results": results,
                   "passed": sum(1 for r in results if r["ok"]),
                   "failed": [r["check"] for r in results if not r["ok"]],
                   "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())},
                  fh, indent=2, ensure_ascii=False)
    print(f"\npassed {sum(1 for r in results if r['ok'])} / {len(results)} -> {path}")


def png_stats(path):
    """Colour statistics of a canvas capture: energy, spread and a coarse fingerprint."""
    im = Image.open(path).convert("RGB").resize((160, 100))
    a = np.asarray(im).astype(np.float32)
    lum = a.mean(axis=2)
    return {"mean": float(lum.mean()), "std": float(lum.std()),
            "p99": float(np.percentile(lum, 99)),
            "lit_fraction": float((lum > 24).mean()),
            "fingerprint": [round(float(v), 1) for v in
                            np.asarray(Image.open(path).convert("L").resize((8, 5))).astype(np.float32).ravel() / 16]}


def png_diff(a, b):
    """Mean absolute luminance difference between two captures of the same region."""
    ia = np.asarray(Image.open(a).convert("L").resize((160, 100))).astype(np.float32)
    ib = np.asarray(Image.open(b).convert("L").resize((160, 100))).astype(np.float32)
    return float(np.abs(ia - ib).mean())


def open_instrument(pw, viewport=(1600, 1100), extra_args=None, grant_mic=False, base=BASE):
    """Launch a browser and bring the instrument up, returning (browser, ctx, page, frame)."""
    args = list(SWIFT) + list(FAKE_MIC) + list(extra_args or [])
    browser = pw.chromium.launch(args=args)
    ctx = browser.new_context(viewport={"width": viewport[0], "height": viewport[1]},
                              permissions=["microphone"] if grant_mic else [])
    page = ctx.new_page()
    page.set_default_timeout(120000)
    page.goto(base + "/experience/universal-resonator", wait_until="networkidle")
    page.wait_for_selector("[data-resonator-launch='true']", state="visible")
    page.click("[data-resonator-launch='true']")
    frame = None
    for _ in range(40):
        frame = next((f for f in page.frames
                      if "universal-resonator/index.html" in (f.url or "")), None)
        if frame:
            break
        page.wait_for_timeout(1000)
    if frame is None:
        raise RuntimeError("the instrument frame never appeared")
    for _ in range(40):
        try:
            if frame.evaluate("() => !!window.resonance"):
                break
        except Exception:
            pass
        page.wait_for_timeout(1000)
    return browser, ctx, page, frame


def state(frame):
    return frame.evaluate("() => window.resonance.getState()")


def evolution(frame):
    return frame.evaluate("() => window.resonance.getEvolution()")


def _clip_shot(page, box, path):
    """Capture a region through CDP.

    Element.screenshot() waits for the element to be "stable", which an endlessly
    animating WebGL canvas never is - it times out at 120s. Capturing the clip region
    directly skips that wait and still reads the compositor, so the WebGL content is real.
    """
    import base64
    cdp = page.context.new_cdp_session(page)
    try:
        res = cdp.send("Page.captureScreenshot", {
            "format": "png", "captureBeyondViewport": False,
            "clip": {"x": float(box["x"]), "y": float(box["y"]),
                     "width": float(box["width"]), "height": float(box["height"]), "scale": 1}})
        with open(path, "wb") as fh:
            fh.write(base64.b64decode(res["data"]))
    finally:
        cdp.detach()
    return path


def canvas_shot(frame, name):
    """Capture the 3D field canvas only."""
    path = os.path.join(SHOTS, name)
    return _clip_shot(frame.page, frame.locator("#field").bounding_box(), path)


def element_shot(frame, selector, name):
    """Capture one element of the instrument (e.g. the plate monitor canvas)."""
    path = os.path.join(SHOTS, name)
    return _clip_shot(frame.page, frame.locator(selector).bounding_box(), path)


def page_shot(page, name, full=False):
    """Capture the page, but never let a slow capture fail the run.

    The instrument animates forever, so Playwright's stability wait can outlast its
    timeout under a software rasteriser. A missing photograph is a gap in the evidence,
    not a defect in the product, so this records the failure and carries on.
    """
    path = os.path.join(SHOTS, name)
    try:
        page.screenshot(path=path, full_page=full, timeout=45000,
                        animations="disabled")
    except Exception as exc:
        try:
            page.screenshot(path=path, timeout=30000)
        except Exception:
            print(f"      [capture skipped] {name}: {type(exc).__name__}")
            return None
    return path


def set_range(frame, ident, value):
    """Drive a real range input the way a visitor would (input + change events)."""
    frame.evaluate("""([id, v]) => { const e=document.getElementById(id);
        e.value=String(v); e.dispatchEvent(new Event('input',{bubbles:true}));
        e.dispatchEvent(new Event('change',{bubbles:true})); }""", [ident, value])


def set_select(frame, ident, value):
    frame.evaluate("""([id, v]) => { const e=document.getElementById(id);
        e.value=v; e.dispatchEvent(new Event('input',{bubbles:true}));
        e.dispatchEvent(new Event('change',{bubbles:true})); }""", [ident, value])


def click_text(frame, text, exact=False):
    """Click a control by its visible text, scoped to the instrument."""
    return frame.evaluate("""([t, ex]) => {
        const norm = s => (s||'').replace(/\\s+/g,' ').trim();
        const els = Array.from(document.querySelectorAll('button,[role=button]'));
        const hit = els.find(e => ex ? norm(e.innerText)===t : norm(e.innerText).toUpperCase().includes(t.toUpperCase()));
        if(!hit) return false; hit.click(); return true; }""", [text, exact])


def webgl_info(frame):
    """Which renderer is actually drawing: real hardware, or a software rasteriser."""
    return frame.evaluate("""() => {
        const c=document.getElementById('field');
        const gl=c.getContext('webgl2')||c.getContext('webgl');
        if(!gl) return {ok:false};
        const d=gl.getExtension('WEBGL_debug_renderer_info');
        return {ok:true, api:(c.getContext('webgl2')?'webgl2':'webgl'),
            vendor: d? gl.getParameter(d.UNMASKED_VENDOR_WEBGL): gl.getParameter(gl.VENDOR),
            renderer: d? gl.getParameter(d.UNMASKED_RENDERER_WEBGL): gl.getParameter(gl.RENDERER),
            maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE)}; }""")
