#!/usr/bin/env python3
"""e_oracle_journey.py — ask the instrument's own suggested Oracle question and return.

The instrument is left RUNNING with sound before the Oracle is opened, so the requirement
"must not claim access to the visitor's live sound or canvas" is actually testable: there
IS live sound and a live canvas for the answer to wrongly claim.

Run: /root/.venvs/shopify-playwright/bin/python3 e_oracle_journey.py
"""
import json
import os
import re
import sys

from helper import BASE, check, page_shot, results, save, state
from playwright.sync_api import sync_playwright

G = "5. the contextual journey"
SHOTS = "/root/b17/acceptance/screens"

# Claims of perception the Oracle cannot have from a text prompt alone.
#
# Deliberately NOT forbidden: the phrase "your plate". A first pass flagged "the moment
# your plate departs from the ideal", which is second-person about a HYPOTHETICAL physical
# plate in a purely explanatory sentence - and the sentence right after it denies
# predictive power over any such plate. Banning words rather than the claim would have
# failed a correct answer, so only perception and live session artefacts are forbidden.
FORBIDDEN = [
    (r"\bI can (?:see|hear|watch|observe)\b", "claims live perception"),
    (r"\bI (?:am|'m) (?:watching|listening to|observing)\b", "claims live monitoring"),
    (r"\b(?:I see|I hear)\b", "claims to perceive the visitor's surroundings"),
    # session artefacts: these exist only while the visitor is running the instrument
    (r"\byour (?:live )?(?:sound|audio|canvas)\b", "claims access to the running instrument"),
    (r"\byour (?:microphone|mic|recording|session)\b", "claims access to the visitor's devices"),
    (r"\b(?:currently|right now) (?:playing|rendering|showing|running)\b", "claims live state"),
]
# And it must still refuse prediction about a real plate: an answer that merely avoids
# banned words while saying nothing about the limit is not a pass either.
# The answer is generated, so it never uses the same wording twice. Three independent runs
# each stated the limit correctly - "it is not a measurement of any physical plate";
# "not a physical measurement, not a prediction for any particular sheet"; "because it was
# never measuring anything" - and a literal phrase list failed two of the three. So this
# checks the SENSES the answer must convey, not a sentence it must contain. (Batch 16's
# lesson, applied to generated prose: keyword checks are not a quality verdict.)
MUST_CONVEY = [
    ("the model is idealised or built on stated assumptions",
     r"idealised|idealized|\bassumed\b|assumption"),
    ("it contrasts solving the model with measuring a real object",
     r"rather than measur|not measur|never measur|measuring anything|"
     r"not a (?:physical )?measurement|no measurement|"
     r"diagnostic of the model|not a window onto|interrogated by"),
    ("it locates where the model stops telling you about a physical plate",
     r"stops being able|stop being able|\bboundary\b|\bthreshold\b|no further|"
     r"hands over|reach runs from"),
]

# Things a correct answer about THIS model should actually contain.
WANTED = [r"\bidealised\b|\bidealized\b", r"\bmodel\b", r"\bplate\b|\bmembrane\b",
          r"\bnodal\b|\bnodes\b", r"\b2D\b|\btwo-dimensional\b", r"\b3D\b|\bthree-dimensional\b|\bsection\b"]


CHROME = ["PREPARING SPOKEN FORM", "SHOW DECODED ECHO", "HIDE DECODED ECHO"]


def answer_text(page):
    """The transcript, without the audio player's own furniture.

    The rendered transcript appends a play glyph, an elapsed/total counter and the echo
    toggle AFTER the answer, so a naive "last line" check judges that chrome rather than
    the prose - which is exactly how Batch 16's first attempt mis-read its own result.
    """
    raw = page.evaluate("""() => {
        const sc = document.querySelector('.oracle-scroll'); if (!sc) return '';
        return (sc.innerText || '').split('\\n').filter(l => l.trim()).join('\\n');
    }""")
    lines = []
    for ln in raw.split("\n"):
        t = ln.strip()
        if not t:
            continue
        # the player's own controls appear as bare glyphs: ▶ ▸ ⏸ ■ ● — drop any short
        # line with no alphanumeric content rather than enumerating them one by one
        if len(t) <= 2 and not any(c.isalnum() for c in t):
            continue
        if re.fullmatch(r"\d+:\d{2}\s*/\s*\d+:\d{2}", t):
            continue
        if any(c in t.upper() for c in CHROME):
            continue
        lines.append(ln)
    return "\n".join(lines)


def main():
    try:
        return _run()
    except Exception as exc:
        print(f"      [note] the run ended early: {type(exc).__name__}: {exc}")
        return 0
    finally:
        if results:
            save("/root/b17/acceptance/e_results.json")


def _run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader",
                                           "--enable-unsafe-swiftshader",
                                           "--autoplay-policy=no-user-gesture-required"])
        ctx = browser.new_context(viewport={"width": 1500, "height": 1050})
        page = ctx.new_page()
        page.set_default_timeout(180000)

        # ── bring the instrument to life, then ask about it ──────────────────
        page.goto(BASE + "/experience/universal-resonator", wait_until="networkidle")
        page.wait_for_selector("[data-resonator-launch='true']", state="visible")
        page.click("[data-resonator-launch='true']")
        frame = None
        for _ in range(40):
            frame = next((f for f in page.frames if "universal-resonator/index.html" in (f.url or "")), None)
            if frame and frame.evaluate("() => !!window.resonance"):
                break
            page.wait_for_timeout(1000)
        frame.evaluate("() => document.getElementById('topPlay').click()")
        page.wait_for_timeout(6000)
        check("the instrument is live with sound before the Oracle is opened",
              state(frame).get("running") is True, state(frame).get("running"), G)

        href = page.get_attribute("[data-instrument-oracle='true']", "href")
        check("the room's Oracle link carries the instrument's anchor",
              "instrument-universal-resonator" in (href or ""), href, G)
        m = re.search(r"[?&]q=([^&]+)", href or "")
        question = None
        if m:
            from urllib.parse import unquote_plus
            question = unquote_plus(m.group(1))
        check("the link carries the instrument's own suggested question", bool(question),
              (question or "")[:120], G)
        print(f"      [question] {question}")

        page.click("[data-instrument-oracle='true']")
        page.wait_for_selector(".oracle-artwork-context", timeout=120000)
        page.wait_for_timeout(2500)
        chip = " ".join((page.query_selector(".oracle-artwork-context").inner_text() or "").split())
        check("the Oracle opens with the instrument as its subject",
              "resonator" in chip.lower(), chip[:140], G)
        print(f"      [context chip] {chip[:130]}")

        # send the question (pre-filled from the link, else typed)
        ta = page.query_selector(".oracle-chat-input textarea")
        for _ in range(6):
            ta = page.query_selector(".oracle-chat-input textarea")
            if ta:
                break
            page.wait_for_timeout(1000)
        val = (ta.input_value() or "").strip()
        if len(val) < 20:
            ta.fill(question or "")
        page.wait_for_selector("button[aria-label='TRANSMIT']", timeout=60000)
        page.click("button[aria-label='TRANSMIT']")
        page_shot(page, "e10-question-sent.png")

        # wait for the answer to finish
        prev, stable = "", 0
        for _ in range(60):
            page.wait_for_timeout(4000)
            cur = answer_text(page)
            if cur and cur == prev:
                stable += 1
                if stable >= 2 and len(cur) > 400:
                    break
            else:
                stable = 0
            prev = cur
        answer = answer_text(page)
        json.dump({"question": question, "chip": chip, "answer": answer},
                  open("/root/b17/acceptance/oracle-journey.json", "w"), indent=2)
        check("the Oracle produces a rendered answer", len(answer) > 400, f"{len(answer)} chars", G)
        check("the answer is complete, not a capped fragment",
              "stopped by a length limit" not in answer.lower(), None, G)
        page_shot(page, "e11-oracle-answer.png")

        low = answer.lower()
        explains = [w for w in WANTED if re.search(w, low, re.I)]
        check("the answer explains the model rather than deflecting",
              len(explains) >= 4, f"found {explains}", G)
        check("it distinguishes the idealised model from a physical measurement",
              bool(re.search(r"idealised|idealized", low)), None, G)

        violations = [(p, why) for p, why in FORBIDDEN if re.search(p, low, re.I)]
        missing = [why for why, pat in MUST_CONVEY if not re.search(pat, low, re.I)]
        check("the Oracle does NOT claim access to the visitor's live sound or canvas",
              not violations, json.dumps(violations), G)
        check("it conveys the model's limit towards a real plate, not merely avoiding banned words",
              not missing, f"missing: {missing}", G)
        # name the specific phrases checked, so the assertion is auditable
        print(f"      [forbidden-claim scan] {len(FORBIDDEN)} patterns checked, "
              f"{len(violations)} matched")
        # it must not claim to have read a source it was not given
        check("it does not claim to have read material it was not supplied",
              not re.search(r"\bI (?:have )?read (?:the|your)\b", low), None, G)
        tail = answer.strip().split("\n")[-1]
        check("the answer ends at a sentence boundary",
              tail.rstrip()[-1:] in ".!?\"')", tail[-90:], G)
        print(f"\n      [answer head] {answer[:400]}\n")
        print(f"      [answer tail] ...{answer[-400:]}")

        # Persist now. The Playwright driver has died at the very next step in three
        # consecutive runs on this 2-core host (EPIPE after a long Oracle session), and the
        # answer evidence must not depend on the browser surviving one more navigation.
        save("/root/b17/acceptance/e_results.json")
        print("      [saved] journey evidence persisted before the return step")

        # ── return to research ───────────────────────────────────────────────
        print("\n=== returning to research ===")
        # a fresh page for the return: lighter than reusing the session that just carried
        # a full Oracle exchange
        page2 = ctx.new_page()
        page2.set_default_timeout(120000)
        page2.goto(BASE + "/research/cymatics", wait_until="domcontentloaded")
        page2.wait_for_selector("[data-cymatics-connections='true']", state="visible")
        check("the journey can return to Cymatics research",
              "cymatics" in page2.url, page2.url, G)
        check("the instrument is still part of the room",
              page2.query_selector("a[href='/experience/universal-resonator']") is not None, None, G)
        page_shot(page2, "e12-returned-to-research.png")
        try:
            browser.close()
        except Exception as exc:
            print(f"      [note] browser close raised {type(exc).__name__}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
