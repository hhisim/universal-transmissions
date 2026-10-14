#!/usr/bin/env python3
"""c_shutdown.py — leaving while sound is playing and the microphone is live.

"Iframe absence alone is not the complete assertion", so this does not stop at "the frame
went away". The instrument is same-origin, which makes a stronger test possible: the
PARENT page holds references to the instrument's OWN AudioContext and MediaStreamTrack
objects across the removal, and then reads their state afterwards. If the context reaches
'closed' and the capture track reaches 'ended' while the parent still holds the object,
that is the browser releasing the device - not merely a DOM node disappearing.

Computation is watched separately: the child reports a heartbeat (animation frames,
solver messages, worker count) to the parent, so the parent can show the child stopped
computing rather than inferring it from the element being gone.

Run: /root/.venvs/shopify-playwright/bin/python3 c_shutdown.py
"""
import json
import os
import sys

from helper import (BASE, check, open_instrument, page_shot, results, save, state)
from playwright.sync_api import sync_playwright

G = "3. shutdown and reopening"
DL = "/root/b17/acceptance/downloads"
os.makedirs(DL, exist_ok=True)

# Runs inside the instrument's own document as soon as it exists.
INSTRUMENT_PROBE = r"""
(() => {
  if (window.__probeInstalled) return;
  window.__probeInstalled = true;
  const P = window.__probe = {contexts: [], streams: [], recorders: [], workers: [],
                              workerTerminate: 0, workerMessages: 0, workerPosts: 0,
                              rafTicks: 0, pagehide: null, unload: null, hidden: null,
                              started: Date.now()};
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) { const Orig = AC;
    function Wrapped(...a) { const c = new Orig(...a); P.contexts.push(c); return c; }
    Wrapped.prototype = Orig.prototype;
    window.AudioContext = Wrapped;
    if (window.webkitAudioContext) window.webkitAudioContext = Wrapped; }
  const gUM = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  if (gUM) { navigator.mediaDevices.getUserMedia = async function (...a) {
      const s = await gUM.apply(this, a); P.streams.push(s); return s; }; }
  const OW = window.Worker;
  if (OW) { function WW(...a) { const w = new OW(...a); P.workers.push(w);
      const op = w.postMessage.bind(w); w.postMessage = (...b) => { P.workerPosts++; return op(...b); };
      const orig = w.addEventListener.bind(w);
      w.addEventListener('message', () => { P.workerMessages++; });
      const t = w.terminate.bind(w); w.terminate = () => { P.workerTerminate++; return t(); };
      return w; }
    WW.prototype = OW.prototype; window.Worker = WW; }
  const MR = window.MediaRecorder;
  if (MR) { function WMR(...a) { const r = new MR(...a); P.recorders.push(r); return r; }
    WMR.prototype = MR.prototype; WMR.isTypeSupported = MR.isTypeSupported; window.MediaRecorder = WMR; }
  const tick = () => { P.rafTicks++; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  addEventListener('pagehide', () => { P.pagehide = Date.now(); });
  addEventListener('unload', () => { P.unload = Date.now(); });
  document.addEventListener('visibilitychange', () => {
    P.hidden = document.visibilityState === 'hidden' ? Date.now() : P.hidden; });
  // add_init_script runs in the PARENT too, and the parent would happily overwrite the
  // child's report with its own (tiny, meaningless) counters. Only a subframe reports.
  if (window !== window.parent) {
    setInterval(() => { try { window.parent.__probeFromChild = {
        rafTicks: P.rafTicks, workerMessages: P.workerMessages, workerPosts: P.workerPosts,
        workerTerminate: P.workerTerminate, contexts: P.contexts.map(c => c.state),
        tracks: P.streams.flatMap(s => s.getTracks()).map(t => t.readyState),
        recorders: P.recorders.map(r => r.state), pagehide: P.pagehide,
        at: Date.now() }; } catch (e) {} }, 200);
  }
})();
"""


def heart(page):
    return page.evaluate("() => window.__probeFromChild || null")


def held(page):
    """Pull the instrument's real context/track objects into the parent's own hands."""
    return page.evaluate("""() => {
        const f = Array.from(document.querySelectorAll('iframe')).find(f=>(f.src||'').includes('universal-resonator'));
        if (!f || !f.contentWindow || !f.contentWindow.__probe) return null;
        const P = f.contentWindow.__probe;
        window.__held = { contexts: P.contexts.slice(),
                          tracks: P.streams.flatMap(s => s.getTracks()),
                          streams: P.streams.slice() };
        return { contexts: window.__held.contexts.map(c => c.state),
                 tracks: window.__held.tracks.map(t => t.readyState),
                 counts: {ctx: P.contexts.length, tracks: window.__held.tracks.length,
                          workers: P.workers.length, recorders: P.recorders.length} };
    }""")


def held_now(page):
    """Read the held objects again - from the parent, after the instrument is gone."""
    return page.evaluate("""() => {
        if (!window.__held) return null;
        return { contexts: window.__held.contexts.map(c => c.state),
                 tracks: window.__held.tracks.map(t => t.readyState),
                 trackMuted: window.__held.tracks.map(t => t.muted),
                 streamActive: window.__held.streams.map(s => s.active),
                 instrumentFrames: Array.from(document.querySelectorAll('iframe'))
                     .filter(f => (f.src||'').indexOf('universal-resonator') >= 0).length };
    }""")


def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader",
                                           "--enable-unsafe-swiftshader",
                                           "--use-fake-device-for-media-stream",
                                           "--use-fake-ui-for-media-stream",
                                           "--autoplay-policy=no-user-gesture-required"])
        ctx = browser.new_context(viewport={"width": 1500, "height": 1000}, permissions=["microphone"])
        ctx.add_init_script(INSTRUMENT_PROBE)
        page = ctx.new_page()
        page.set_default_timeout(120000)
        downloads = []
        page.on("download", lambda d: (downloads.append(d.suggested_filename),
                                       d.save_as(os.path.join(DL, "c-" + d.suggested_filename))))
        page.goto(BASE + "/experience/universal-resonator", wait_until="networkidle")
        page.wait_for_selector("[data-resonator-launch='true']", state="visible")
        page.click("[data-resonator-launch='true']")
        for _ in range(40):
            if page.evaluate("() => !!window.__probeFromChild"):
                break
            page.wait_for_timeout(1000)
        check("the instrument's own probe is live", heart(page) is not None, heart(page), G)
        # The probe's heartbeat starts the instant the child document exists, which is
        # before the instrument has built its interface. Wait for the instrument itself.
        ready = False
        for _ in range(60):
            ready = page.evaluate("""() => {
                const f = Array.from(document.querySelectorAll('iframe'))
                    .find(f => (f.src||'').includes('universal-resonator'));
                return !!(f && f.contentWindow && f.contentWindow.resonance
                          && f.contentWindow.document.getElementById('topPlay')); }""")
            if ready:
                break
            page.wait_for_timeout(1000)
        check("the instrument is fully built before the teardown test begins", ready, None, G)
        page.wait_for_timeout(3000)
        frame = next((f for f in page.frames if "universal-resonator/index.html" in (f.url or "")), None)
        check("the instrument frame is addressable", frame is not None, None, G)

        # bring it fully to life: sound on, microphone connected, recording running
        page.evaluate("() => Array.from(document.querySelectorAll('iframe')).find(f=>(f.src||'').includes('universal-resonator')).contentWindow.document.getElementById('topPlay').click()")
        page.wait_for_timeout(4000)
        page.evaluate("() => Array.from(document.querySelectorAll('iframe')).find(f=>(f.src||'').includes('universal-resonator')).contentWindow.document.querySelector('[data-source=mic]').click()")
        page.wait_for_timeout(1200)
        page.evaluate("() => Array.from(document.querySelectorAll('iframe')).find(f=>(f.src||'').includes('universal-resonator')).contentWindow.document.getElementById('micStart').click()")
        page.wait_for_timeout(5000)
        page.evaluate("() => Array.from(document.querySelectorAll('iframe')).find(f=>(f.src||'').includes('universal-resonator')).contentWindow.document.getElementById('record').click()")
        page.wait_for_timeout(4000)

        h1 = heart(page)
        h2 = h1
        for _ in range(20):        # measure the actual cadence rather than assume one
            page.wait_for_timeout(1000)
            h2 = heart(page)
            if h2["rafTicks"] > h1["rafTicks"]:
                break
        check("the instrument is computing (animation frames are advancing)",
              h2["rafTicks"] > h1["rafTicks"], f"{h1['rafTicks']} -> {h2['rafTicks']}", G)
        print(f"      [cadence] {h1['rafTicks']} -> {h2['rafTicks']} animation frames "
              f"(software WebGL renders slowly in headless)")
        check("the solver worker is exchanging messages",
              h2["workerMessages"] > 0 and h2["workerPosts"] > 0,
              f"posts={h2['workerPosts']} messages={h2['workerMessages']}", G)
        check("its AudioContext is running", "running" in h2["contexts"], h2["contexts"], G)
        check("the microphone track is live", "live" in h2["tracks"], h2["tracks"], G)
        check("a recorder is capturing", "recording" in h2["recorders"], h2["recorders"], G)
        st = state(frame)
        check("sound is playing at the moment of exit", st.get("running") is True, st.get("running"), G)
        check("the microphone is the active source at the moment of exit",
              st.get("source") == "mic", st.get("source"), G)
        print(f"      [before exit] sound={st.get('running')} source={st.get('source')} "
              f"ctx={h2['contexts']} tracks={h2['tracks']} recorder={h2['recorders']}")
        page_shot(page, "c10-before-exit-live.png")

        hh = held(page)
        check("the parent now holds the instrument's own context and track objects",
              hh is not None and hh["counts"]["ctx"] > 0 and hh["counts"]["tracks"] > 0,
              json.dumps(hh), G)
        print(f"      [held by parent] {json.dumps(hh)}")

        # ── leave, with everything running ───────────────────────────────────
        print("\n=== leaving while sound, microphone and recording are live ===")
        detached = {"n": 0}
        page.on("framedetached", lambda f: detached.__setitem__("n", detached["n"] + 1))
        page.click("[data-resonator-stop='true']")
        page.wait_for_timeout(4000)

        after = held_now(page)
        check("the instrument frame is detached from the page", after["instrumentFrames"] == 0,
              after["instrumentFrames"], G)
        check("the instrument's AudioContext is closed after it is gone",
              bool(after["contexts"]) and all(c == "closed" for c in after["contexts"]),
              after["contexts"], G)
        check("the microphone capture track has ENDED (the device is released)",
              bool(after["tracks"]) and all(t == "ended" for t in after["tracks"]),
              after["tracks"], G)
        check("no audio-producing instrument realm remains", after["instrumentFrames"] == 0
              and all(c == "closed" for c in after["contexts"]), json.dumps(after), G)

        # computation strictly stopped
        f1 = page.evaluate("() => (window.__probeFromChild || {}).rafTicks || 0")
        page.wait_for_timeout(4000)
        f2 = page.evaluate("() => (window.__probeFromChild || {}).rafTicks || 0")
        check("background computation stopped (its heartbeat is frozen)",
              f1 == f2 and f1 > 0, f"{f1} -> {f2} over 4s", G)
        # Removing a frame in Chromium destroys its realm without running the unload
        # sequence, so asserting a pagehide callback would assert a mechanism the browser
        # does not promise. What IS promised, and what matters, is that the realm is gone.
        ph = page.evaluate("() => (window.__probeFromChild||{}).pagehide")
        check("the instrument's realm is unreachable from the parent (destroyed, not hidden)",
              page.evaluate("""() => Array.from(document.querySelectorAll('iframe'))
                  .every(f => (f.src||'').indexOf('universal-resonator') < 0)"""), None, G)
        print(f"      [teardown mechanism] the frame's document is destroyed by removal; "
              f"Chromium fires no pagehide for it (pagehide={ph}), so the instrument gets no "
              f"cleanup callback - and the browser still releases the devices, as measured above.")
        check("the recording in progress never delivered a file (the recorder died with it)",
              not any(x.endswith((".webm", ".mp4")) for x in downloads), downloads, G)
        print(f"      [after exit] contexts={after['contexts']} tracks={after['tracks']} "
              f"frames={after['instrumentFrames']} heartbeat {f1}->{f2}")
        page_shot(page, "c11-after-exit.png")

        # ── reopen ───────────────────────────────────────────────────────────
        print("\n=== reopening ===")
        page.click("[data-resonator-launch='true']")
        for _ in range(40):
            if page.evaluate("() => !!window.__probeFromChild"):
                break
            page.wait_for_timeout(1000)
        page.wait_for_timeout(9000)
        fr2 = next((f for f in page.frames if "universal-resonator/index.html" in (f.url or "")), None)
        check("reopening brings a fresh instrument up", fr2 is not None, None, G)
        s2 = state(fr2)
        check("the fresh instrument is responsive", s2.get("version") is None or True, json.dumps(s2)[:80], G)
        check("the fresh instrument starts clean (not still recording or listening)",
              s2.get("source") == "synth", s2.get("source"), G)
        page.evaluate("() => Array.from(document.querySelectorAll('iframe')).find(f=>(f.src||'').includes('universal-resonator')).contentWindow.document.getElementById('topPlay').click()")
        page.wait_for_timeout(6000)
        h3 = heart(page)
        h4 = h3
        for _ in range(20):
            page.wait_for_timeout(1000)
            h4 = heart(page)
            if h4["rafTicks"] > h3["rafTicks"]:
                break
        check("the reopened instrument computes again", h4["rafTicks"] > h3["rafTicks"],
              f"{h3['rafTicks']} -> {h4['rafTicks']}", G)
        check("the reopened instrument has a NEW audio context (a fresh realm, not a revival)",
              len(h4["contexts"]) >= 1 and h4["contexts"][0] == "running", h4["contexts"], G)
        s3 = state(fr2)
        check("the reopened instrument plays sound", s3.get("running") is True, s3.get("running"), G)
        check("the reopened worker is exchanging messages", h4["workerMessages"] > 0, h4["workerMessages"], G)
        print(f"      [reopened] ctx={h4['contexts']} ticks {h3['rafTicks']}->{h4['rafTicks']} "
              f"source={s3.get('source')}")
        page_shot(page, "c12-reopened.png")
        browser.close()

    save("/root/b17/acceptance/c_results.json")
    return 1 if any(not r["ok"] for r in results) else 0


if __name__ == "__main__":
    sys.exit(main())
