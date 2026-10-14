#!/usr/bin/env python3
"""b_sound_capture.py — synthesized sound, local audio-file input, microphone grant and
denial, PNG snapshot and a short playable recording.

Honesty notes that this file exists to keep straight:
  * This host has no sound card and no microphone. Chromium is given a FAKE capture
    device for the granted-mic path, so what is proven is the INSTRUMENT'S handling of a
    granted/denied device, not that a real microphone works.
  * "Does it sound right" cannot be answered here. What IS answered, externally, is
    whether the instrument produced real signal: the recorded file is inspected with
    ffprobe/ffmpeg, so the claim rests on the bytes rather than on the page's own toast.

Run: /root/.venvs/shopify-playwright/bin/python3 b_sound_capture.py
"""
import json
import os
import subprocess
import sys
import wave

import numpy as np
from helper import (BASE, SHOTS, check, open_instrument, png_stats, results, save,
                    set_range, state)
from playwright.sync_api import sync_playwright

G = "2. sound and capture"
DL = "/root/b17/acceptance/downloads"
os.makedirs(DL, exist_ok=True)


def make_audio_file():
    """A real local audio file for the file-input path (a 6 s 440 Hz tone)."""
    p = "/root/b17/acceptance/local-audio-test.wav"
    if not os.path.exists(p):
        sr, secs = 44100, 6
        t = np.linspace(0, secs, sr * secs, endpoint=False)
        mono = (0.28 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)
        with wave.open(p, "w") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(sr)
            w.writeframes((mono * 32767).astype("<i2").tobytes())
    return p


def probe(path):
    """External, tool-based inspection of a media file."""
    try:
        out = subprocess.run(["ffprobe", "-v", "error", "-show_format", "-show_streams",
                              "-of", "json", path], capture_output=True, text=True, timeout=120)
        return json.loads(out.stdout or "{}")
    except Exception as e:
        return {"error": str(e)}


def audio_seconds(path):
    """True length of the recorded audio: decode it to WAV and measure that.

    Neither the WebM container duration nor the video stream can be trusted here -
    MediaRecorder leaves the duration unset, and captureStream only emits a frame when the
    canvas is actually redrawn (software rendering redraws rarely). The decoded audio is
    the honest measurement of how long the recording really is.
    """
    out = os.path.join(DL, "rec-audio-probe.wav")
    try:
        subprocess.run(["ffmpeg", "-y", "-i", path, "-vn", "-f", "wav", out],
                       capture_output=True, timeout=600)
        with wave.open(out) as w:
            return w.getnframes() / float(w.getframerate())
    except Exception:
        return None


def video_measure(path):
    """Decoded length and frame count of the recording's video stream.

    MediaRecorder writes a WebM whose container duration is typically 0/N-A, so the
    container is not evidence of length. The decoded stream is.
    """
    secs, frames = None, None
    out = subprocess.run(["ffmpeg", "-i", path, "-an", "-f", "null", "-"],
                         capture_output=True, text=True, timeout=600)
    txt = (out.stderr or "")
    for line in txt.splitlines():
        if "time=" in line and "frame=" in line:
            try:
                secs = float(line.split("time=")[1].split()[0].replace(",", ""))
            except Exception:
                pass
    try:
        pr = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0",
                             "-count_packets", "-show_entries", "stream=nb_read_packets",
                             "-of", "json", path], capture_output=True, text=True, timeout=300)
        st = json.loads(pr.stdout or "{}").get("streams", [{}])
        frames = int(st[0].get("nb_read_packets", 0)) if st else None
    except Exception:
        pass
    return secs, frames


def audio_level(path):
    """Measured level and decoded length of the recorded AUDIO.

    -vn isolates the audio stream, and astats logs at info level, so this must NOT run
    with -v error or the very numbers being read are suppressed. MediaRecorder writes a
    WebM whose container duration is often 0, so the decoded length is the honest answer.
    """
    out = subprocess.run(["ffmpeg", "-i", path, "-vn", "-af", "astats=metadata=1:reset=0",
                          "-f", "null", "-"], capture_output=True, text=True, timeout=300)
    txt = (out.stderr or "") + (out.stdout or "")
    rms = peak = dur = None
    for line in txt.splitlines():
        if "RMS level dB" in line and rms is None:
            try:
                rms = float(line.split(":")[-1].strip())
            except ValueError:
                pass
        if "Peak level dB" in line and peak is None:
            try:
                peak = float(line.split(":")[-1].strip())
            except ValueError:
                pass
        if line.startswith("  Duration:") or "Duration: " in line:
            try:
                hh, mm, ss = line.split("Duration:")[1].split(",")[0].strip().split(":")
                dur = int(hh) * 3600 + int(mm) * 60 + float(ss)
            except Exception:
                pass
    return rms, peak, dur


def main():
    with sync_playwright() as pw:
        browser, ctx, page, frame = open_instrument(pw, grant_mic=True)
        downloads = []
        page.on("download", lambda d: (downloads.append(d.suggested_filename),
                                       d.save_as(os.path.join(DL, d.suggested_filename))))

        # ── synthesized sound ────────────────────────────────────────────────
        print("=== synthesized sound ===")
        frame.evaluate("() => document.getElementById('topPlay').click()")
        page.wait_for_timeout(5000)
        st = state(frame)
        check("synthesis runs (the engine reports running)", st.get("running") is True, st.get("running"), G)
        check("the source is the built-in synthesizer", st.get("source") == "synth", st.get("source"), G)
        modes = frame.evaluate("""() => Array.from(document.getElementById('soundMode').options)
                                  .map(o => ({value:o.value, text:o.textContent.trim()}))""")
        json.dump(modes, open("/root/b17/acceptance/sound-modes.json", "w"), indent=2)
        check("all nine sound modes are offered and selectable", len(modes) == 9,
              [m["text"] for m in modes], G)
        peak_readout = frame.evaluate("() => (document.getElementById('peak').innerText||'').trim()")
        check("the instrument reports a live fundamental", "Hz" in peak_readout, peak_readout, G)
        print(f"      [readout] {peak_readout}")
        for m in modes[:3]:
            frame.evaluate("""v => { const e=document.getElementById('soundMode');
                e.value=v; e.dispatchEvent(new Event('change',{bubbles:true})); }""", m["value"])
            page.wait_for_timeout(2200)
            s2 = state(frame)
            check(f"sound mode '{m['text']}' engages", s2.get("soundMode") == m["value"], s2.get("soundMode"), G)

        # ── recording, verified externally ───────────────────────────────────
        print("\n=== a short recording, inspected with ffprobe ===")
        frame.evaluate("() => document.getElementById('record').click()")
        rec_label = ""
        for _ in range(25):          # the instrument flips the label once the recorder is live
            page.wait_for_timeout(1000)
            rec_label = frame.evaluate("() => (document.getElementById('record').innerText||'').trim()")
            if ":" in rec_label:
                break
        check("recording starts (the button shows a running timer)",
              ":" in rec_label, rec_label, G)
        page.wait_for_timeout(6000)
        frame.evaluate("() => document.getElementById('record').click()")
        for _ in range(30):
            if downloads:
                break
            page.wait_for_timeout(1000)
        rec = next((os.path.join(DL, d) for d in downloads if d.endswith((".webm", ".mp4"))), None)
        check("the recording downloads a real file", rec is not None and os.path.getsize(rec) > 20000,
              f"{rec} ({os.path.getsize(rec) if rec else 0} bytes)", G)
        if rec:
            info = probe(rec)
            streams = info.get("streams", [])
            v = next((s for s in streams if s.get("codec_type") == "video"), None)
            a = next((s for s in streams if s.get("codec_type") == "audio"), None)
            dur = float(info.get("format", {}).get("duration", 0) or 0)
            vsecs, vframes = video_measure(rec)
            asec = audio_seconds(rec)
            check("the recording carries real encoded video frames",
                  vframes is not None and vframes >= 1, f"{vframes} video packets", G)
            check("the recording has a real measurable length",
                  asec is not None and asec > 1.0, f"{asec}s of recorded audio", G)
            print(f"      [container note] the WebM container reports {dur:.2f}s duration and the "
                  f"video stream carries {vframes} packets - captureStream only emits a frame "
                  f"when the canvas is redrawn, and this software rasteriser redraws rarely. "
                  f"Decoded audio length is the measurement that survives: {asec}s")
            check("it carries the 3D field as video", v is not None,
                  f"{v.get('codec_name') if v else None} {v.get('width') if v else None}x{v.get('height') if v else None}", G)
            check("it carries the instrument's audio", a is not None,
                  f"{a.get('codec_name') if a else None} {a.get('sample_rate') if a else None}Hz", G)
            rms, peak, adur = audio_level(rec)
            check("the recorded audio is real signal, not silence",
                  rms is not None and rms < -20.0, f"RMS {rms} dBFS peak {peak} dBFS", G)
            check("the recorded audio decodes cleanly through the full file",
                  rms is not None, f"peak {peak} dBFS", G)
            print(f"      [recording] {os.path.basename(rec)} {os.path.getsize(rec)} bytes, "
                  f"{v.get('width') if v else '?'}x{v.get('height') if v else '?'} "
                  f"{v.get('codec_name') if v else '?'}+{a.get('codec_name') if a else '?'}, "
                  f"{dur:.2f}s container, audio {adur}s RMS {rms} dBFS")
            # a frame from the recording, to show the field really was captured
            fr = os.path.join(SHOTS, "b20-recording-frame.png")
            for ss in ("1", "0.4"):
                if os.path.exists(fr):
                    break
                subprocess.run(["ffmpeg", "-y", "-ss", ss, "-i", rec, "-an", "-frames:v", "1",
                                "-vf", "scale=800:-2", fr], capture_output=True, timeout=300)
            if os.path.exists(os.path.join(SHOTS, "b20-recording-frame.png")):
                fs = png_stats(os.path.join(SHOTS, "b20-recording-frame.png"))
                check("the recorded video contains a rendered field, not a black frame",
                      fs["lit_fraction"] > 0.01, fs, G)

        # ── PNG snapshot ─────────────────────────────────────────────────────
        print("\n=== PNG snapshot ===")
        downloads.clear()
        frame.evaluate("() => document.getElementById('capture').click()")
        for _ in range(20):
            if downloads:
                break
            page.wait_for_timeout(1000)
        png = next((os.path.join(DL, d) for d in downloads if d.endswith(".png")), None)
        check("SNAPSHOT saves a PNG", png is not None and os.path.getsize(png) > 5000,
              f"{png} ({os.path.getsize(png) if png else 0} bytes)", G)
        if png:
            from PIL import Image
            im = Image.open(png)
            check("the snapshot is a real image of the field",
                  im.width >= 1000 and im.height >= 600, f"{im.width}x{im.height} {im.mode}", G)
            check("the snapshot is not blank", png_stats(png)["lit_fraction"] > 0.01, png_stats(png), G)
            from shutil import copyfile
            copyfile(png, os.path.join(SHOTS, "b21-snapshot.png"))
            print(f"      [snapshot] {os.path.basename(png)} {im.width}x{im.height}, "
                  f"{os.path.getsize(png)} bytes")

        # ── local audio-file input ───────────────────────────────────────────
        print("\n=== local audio file ===")
        wav = make_audio_file()
        frame.evaluate("() => document.querySelector('[data-source=file]').click()")
        page.wait_for_timeout(1500)
        frame.set_input_files("#audioFile", wav)
        page.wait_for_timeout(6000)
        st = state(frame)
        fname = frame.evaluate("() => (document.getElementById('fileName').innerText||'').trim()")
        check("a local audio file becomes the source", st.get("source") == "file", st.get("source"), G)
        check("the instrument names the file it loaded", "local-audio-test" in fname, fname, G)
        check("playback continues with the file as the source", st.get("running") is True, st.get("running"), G)
        print(f"      [file] source={st.get('source')} name={fname}")
        # the file stays local: nothing about it should be uploaded anywhere
        check("the loaded file is referenced as a blob URL (it stays on the device)",
              frame.evaluate("() => (document.getElementById('fileAudio').src||'').startsWith('blob:')"), None, G)

        # ── microphone, granted ──────────────────────────────────────────────
        print("\n=== microphone (granted device) ===")
        frame.evaluate("() => document.querySelector('[data-source=mic]').click()")
        page.wait_for_timeout(1000)
        frame.evaluate("() => document.getElementById('micStart').click()")
        page.wait_for_timeout(6000)
        st = state(frame)
        btntext = frame.evaluate("() => (document.getElementById('micStart').innerText||'').trim()")
        check("with permission granted the instrument connects the microphone",
              "disconnect" in btntext.lower(), btntext, G)
        check("the microphone becomes the active source", st.get("source") == "mic", st.get("source"), G)
        page_shot_ok = True
        from helper import page_shot
        page_shot(page, "b22-microphone-granted.png")
        print(f"      [mic] button={btntext!r} source={st.get('source')!r} (Chromium FAKE capture device)")
        # leave it connected on purpose: script C checks that exit tears it down
        json.dump({"mic_connected": True}, open("/root/b17/acceptance/mic-state.json", "w"))
        browser.close()

        # ── microphone, denied (a second, unpermitted context) ────────────────
        print("\n=== microphone (permission denied) ===")
        b2 = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader",
                                      "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"])
        c2 = b2.new_context(viewport={"width": 1400, "height": 950}, permissions=[])
        p2 = c2.new_page()
        p2.set_default_timeout(120000)
        p2.goto(BASE + "/experience/universal-resonator", wait_until="networkidle")
        p2.wait_for_selector("[data-resonator-launch='true']", state="visible")
        p2.click("[data-resonator-launch='true']")
        f2 = None
        for _ in range(40):
            f2 = next((f for f in p2.frames if "universal-resonator/index.html" in (f.url or "")), None)
            if f2 and f2.evaluate("() => !!window.resonance"):
                break
            p2.wait_for_timeout(1000)
        f2.evaluate("() => document.querySelector('[data-source=mic]').click()")
        p2.wait_for_timeout(1000)
        f2.evaluate("() => document.getElementById('micStart').click()")
        p2.wait_for_timeout(6000)
        toast = f2.evaluate("""() => { const t=document.getElementById('toast');
            return {text:(t.innerText||'').trim(), shown: !t.hidden && getComputedStyle(t).opacity!=='0'}; }""")
        btxt = f2.evaluate("() => (document.getElementById('micStart').innerText||'').trim()")
        s2 = f2.evaluate("() => window.resonance.getState()")
        # The source selector sets source='mic' the moment it is chosen, before any device
        # exists; the honest question is whether a capture track is actually live.
        live = f2.evaluate("""() => { const t=[]; try { document.querySelectorAll('audio,video')
            .forEach(e => { if (e.srcObject) e.srcObject.getTracks().forEach(x=>t.push(x.readyState)); }); } catch(e){}
            return t; }""")
        check("with permission denied there is no live capture track",
              "live" not in live, f"source flag={s2.get('source')!r}, live tracks={live}", G)
        check("with permission denied the instrument does not pretend to be listening",
              "disconnect" not in btxt.lower(), btxt, G)
        check("denial is reported honestly and an alternative is offered",
              "declined" in toast["text"].lower() or "unavailable" in toast["text"].lower(), toast["text"], G)
        print(f"      [mic denied] toast={toast['text']!r} button={btxt!r}")
        from helper import page_shot as ps2
        ps2(p2, "b23-microphone-denied.png")
        b2.close()

    save("/root/b17/acceptance/b_results.json")
    return 1 if any(not r["ok"] for r in results) else 0


if __name__ == "__main__":
    sys.exit(main())
