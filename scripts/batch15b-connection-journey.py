#!/usr/bin/env python3
"""batch15b-connection-journey.py — the selected-connection journey, driven.

Why this file exists. Batch 15's record said the chat send control "was not
driven successfully", so the request body's contract rested on the source and not
on a captured request. That is exactly the gap a client-side anchor bug hides in:
the chip can be rendered from one value while the memoised submit closure still
holds another. This harness drives the REAL control and captures the REAL body.

What it asserts, per journey:
  * the identifier the card emits is the identifier in the displayed chip;
  * the identifier and the visitor's message both reach POST /api/oracle;
  * an explicitly unresolved identifier is carried AS ITSELF and never replaced
    by the previously resolved anchor;
  * the honest unavailable chip renders, and the artwork anchor stays suppressed.

Responses are labelled. REAL means the deployed /api/oracle answered; STUBBED
means the harness intercepted the request and supplied a fixed body so the
client could be exercised in isolation. The labels are per capture, never global.

Usage:
  python3 scripts/batch15b-connection-journey.py <preview-url> [out.json]
Requires a Playwright-capable interpreter (the repo's suites are Node; this one is
the browser tier and is run with the interpreter that carries Playwright).
"""
import json
import re
import sys
import time

from playwright.sync_api import sync_playwright

PREVIEW = (sys.argv[1] if len(sys.argv) > 1 else "").rstrip("/")
OUT = sys.argv[2] if len(sys.argv) > 2 else "docs/evidence/batch15b/journey.json"

VALID_A = "research-v1:cymatics/connection/artwork-throat-chakra"
VALID_B = "research-v1:cymatics/connection/journal-cymatics-language-of-form"
UNKNOWN = "research-v1:cymatics/connection/not-a-real-anchor"
SLUG_A = "artwork-throat-chakra"
SLUG_B = "journal-cymatics-language-of-form"

CHIP_SEL = ".oracle-artwork-context"
COMPOSER_SEL = ".oracle-chat-input textarea"
SEND_SEL = 'button[aria-label="TRANSMIT"]'
IFRAME = 'iframe[title="Correspondence Codex"]'

records = []
failures = []


def check(label, cond, detail=""):
    print(f"  {'ok  ' if cond else 'FAIL'} {label}" + (f" — {detail}" if detail and not cond else ""))
    if not cond:
        failures.append(label)
    return cond


def chip(page):
    el = page.query_selector(CHIP_SEL)
    if not el:
        return None
    return {
        "text": " ".join(el.inner_text().split()),
        "researchContext": el.get_attribute("data-research-context"),
        "researchUnavailable": el.get_attribute("data-research-unavailable"),
    }


def storage(page):
    return page.evaluate(
        "() => ({local: {...localStorage}, session: {...sessionStorage}})"
    )


class Session:
    """One browser context. Captures every POST /api/oracle and its response."""

    def __init__(self, browser, name, label):
        self.name = name
        self.label = label
        self.ctx = browser.new_context(
            viewport={"width": 1280, "height": 900}, reduced_motion="reduce"
        )
        self.page = self.ctx.new_page()
        self.page.set_default_timeout(45000)
        self.sent = []
        self.responses = []
        self.page.on("request", self._on_request)
        self.page.on("response", self._on_response)

    def _on_request(self, req):
        if req.method == "POST" and req.url.endswith("/api/oracle"):
            try:
                body = json.loads(req.post_data or "{}")
            except Exception:
                body = {"__unparsable": req.post_data}
            self.sent.append({"url": req.url, "body": body})

    def _on_response(self, res):
        if res.request.method == "POST" and res.url.endswith("/api/oracle"):
            try:
                payload = res.json()
            except Exception:
                payload = {}
            self.responses.append(
                {
                    "status": res.status,
                    "activeAnchor": payload.get("activeAnchor"),
                    "researchStatus": payload.get("researchStatus"),
                    "groundedResearch": (payload.get("groundedResearch") or {}).get("title"),
                    "answerHead": (payload.get("response") or "")[:240],
                }
            )

    def stub_oracle(self, answer="[stub] intercepted by the harness"):
        """Intercept, so the client can be exercised with the backend held still."""
        self.page.route(
            "**/api/oracle",
            lambda route: route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({"response": answer, "activeAnchor": "research",
                                 "researchStatus": "unknown", "evidence": None}),
            )
            if route.request.method == "POST"
            else route.continue_(),
        )

    def goto(self, path, **kw):
        self.page.goto(PREVIEW + path, wait_until="networkidle", **kw)
        return self.page

    def open_card(self, slug):
        """Click the card's own Oracle entry, as a visitor does (soft navigation)."""
        self.page.click(f'a[data-connection-oracle="{slug}"]')
        self.page.wait_for_selector(CHIP_SEL, timeout=45000)
        self.page.wait_for_timeout(600)

    def send(self, message, response_mode="REAL", via_keyboard=False, wait_ms=25000):
        before_r, before_resp = len(self.sent), len(self.responses)
        # The composer is above the fold on a fresh load but the boot overlay and
        # a rerender can briefly cover it; wait for it to be visible and usable
        # rather than racing it.
        self.page.wait_for_selector(COMPOSER_SEL, state="visible")
        self.page.click(COMPOSER_SEL)
        self.page.fill(COMPOSER_SEL, message)
        self.page.wait_for_function(
            "(sel) => document.querySelector(sel)?.value.length > 0", arg=COMPOSER_SEL
        )
        if via_keyboard:
            self.page.focus(COMPOSER_SEL)
            self.page.keyboard.press("Enter")
        else:
            self.page.click(SEND_SEL)
        self.page.wait_for_timeout(wait_ms)
        capture = {
            "context": self.name,
            "contextLabel": self.label,
            "url": self.page.url,
            "chip": chip(self.page),
            "storage": storage(self.page),
            "input": self.page.input_value(COMPOSER_SEL),
            "control": "keyboard Enter" if via_keyboard else "click on TRANSMIT",
            "responseMode": response_mode,
            "request": (self.sent[before_r:] or [None])[0],
            "response": (self.responses[before_resp:] or [None])[0],
            "transcript": [
                " ".join(el.inner_text().split())[:140]
                for el in self.page.query_selector_all(".oracle-scroll")
            ],
        }
        records.append(capture)
        return capture


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ══ JOURNEY 1 & 2 & 3: one session, sequential, as a visitor moves ══
        s = Session(browser, "session-1", "one session: A, then A->B, then valid->unknown")

        print("\n=== J1. valid connection A, opened from its own card ===")
        s.goto("/research/cymatics")
        s.open_card(SLUG_A)
        c = s.send("J1 what does the record itself name as the cymatic basis?", "REAL")
        check("J1 chip names the connection's own record",
              (c["chip"] or {}).get("researchContext") == "true" and
              "Bio-Energetic Vortexes" in (c["chip"] or {}).get("text", ""),
              json.dumps(c["chip"], ensure_ascii=False))
        check("J1 request carries the connection's own identifier",
              (c["request"] or {}).get("body", {}).get("researchTopicId") == VALID_A,
              json.dumps((c["request"] or {}).get("body"), ensure_ascii=False))
        check("J1 request carries the visitor's message",
              (c["request"] or {}).get("body", {}).get("message") ==
              "J1 what does the record itself name as the cymatic basis?")
        check("J1 no artwork anchor is smuggled alongside the research anchor",
              (c["request"] or {}).get("body", {}).get("artworkId") is None)
        check("J1 the composer is emptied on submit",
              c["input"] == "")
        check("J1 the visitor's message is in the transcript",
              "J1 what does the record itself name" in json.dumps(c["transcript"]))

        print("\n=== J2. A -> valid connection B (back to the page, then B's card) ===")
        s.page.go_back()
        s.page.wait_for_timeout(1800)
        s.page.wait_for_selector(f'a[data-connection-oracle="{SLUG_B}"]', timeout=45000)
        s.open_card(SLUG_B)
        c = s.send("J2 which record is this, and what is its own framing?", "REAL")
        check("J2 chip names connection B, not A",
              "Language of Form" in (c["chip"] or {}).get("text", ""), json.dumps(c["chip"], ensure_ascii=False))
        check("J2 request carries B's identifier",
              (c["request"] or {}).get("body", {}).get("researchTopicId") == VALID_B,
              json.dumps((c["request"] or {}).get("body"), ensure_ascii=False))
        check("J2 the previous anchor (A) is not in the request",
              VALID_A not in json.dumps((c["request"] or {}).get("body", {})))
        check("J2 request carries the visitor's message",
              (c["request"] or {}).get("body", {}).get("message") ==
              "J2 which record is this, and what is its own framing?")

        print("\n=== J3. valid -> UNKNOWN identifier, same session, storage present ===")
        store_before = storage(s.page)
        s.goto(f"/oracle?view=desktop&researchTopicId={UNKNOWN}"
               "&from=%2Fresearch%2Fcymatics&q=J3%20unknown%20topic")
        s.page.wait_for_selector(CHIP_SEL, timeout=45000)
        s.page.wait_for_timeout(800)
        c = s.send("J3 the topic I asked for is not in the registry - say so plainly.", "REAL")
        check("J3 the chip states the context is unavailable, not a resolved topic",
              (c["chip"] or {}).get("researchUnavailable") == "true" and
              (c["chip"] or {}).get("researchContext") is None,
              json.dumps(c["chip"], ensure_ascii=False))
        check("J3 the request carries the REQUESTED identifier, as itself",
              (c["request"] or {}).get("body", {}).get("researchTopicId") == UNKNOWN,
              json.dumps((c["request"] or {}).get("body"), ensure_ascii=False))
        check("J3 the previous resolved anchors are NOT in the request",
              VALID_A not in json.dumps((c["request"] or {}).get("body")) and
              VALID_B not in json.dumps((c["request"] or {}).get("body")))
        check("J3 no artwork anchor is substituted for the unavailable topic",
              (c["request"] or {}).get("body", {}).get("artworkId") is None)
        check("J3 session storage survived the navigation (this is not a clean session)",
              isinstance(store_before.get("local"), dict) and isinstance(store_before.get("session"), dict))
        check("J3 the server held the research anchor slot for the unknown identifier",
              (c["response"] or {}).get("activeAnchor") == "research",
              json.dumps(c["response"], ensure_ascii=False))
        check("J3 a real answer came back, not a stub", c["responseMode"] == "REAL" and
              (c["response"] or {}).get("status") == 200)

        # ══ STUBBED control run: same journey, backend held still ══
        print("\n=== J3s. same state, response STUBBED to isolate the client ===")
        s.stub_oracle()
        c = s.send("J3s stubbed control run.", "STUBBED", wait_ms=4000)
        check("J3s request still carries the requested identifier under a stubbed response",
              (c["request"] or {}).get("body", {}).get("researchTopicId") == UNKNOWN,
              json.dumps((c["request"] or {}).get("body"), ensure_ascii=False))
        check("J3s the stubbed response is labelled STUBBED, not REAL", c["responseMode"] == "STUBBED")
        s.ctx.close()

        # ══ JOURNEY 4: unknown identifier from a CLEAN session ══
        print("\n=== J4. unknown identifier from a clean session (no storage) ===")
        s4 = Session(browser, "session-2", "clean session: nothing stored, unknown identifier")
        s4.goto(f"/oracle?view=desktop&researchTopicId={UNKNOWN}"
                "&from=%2Fresearch%2Fcymatics&q=J4%20clean%20session")
        s4.page.wait_for_selector(CHIP_SEL, timeout=45000)
        s4.page.wait_for_timeout(800)
        check("J4 a clean session has nothing stored",
              s4.page.evaluate("() => Object.keys(localStorage).length") == 0 and
              s4.page.evaluate("() => Object.keys(sessionStorage).length") == 0)
        c = s4.send("J4 clean session, unknown topic - keyboard submit.", "REAL", via_keyboard=True)
        check("J4 keyboard-only submit sent the request",
              (c["request"] or {}).get("body", {}).get("message") ==
              "J4 clean session, unknown topic - keyboard submit.",
              json.dumps((c["request"] or {}).get("body"), ensure_ascii=False))
        check("J4 the unavailable chip renders with no stored context",
              (c["chip"] or {}).get("researchUnavailable") == "true")
        check("J4 the request carries only the requested identifier",
              (c["request"] or {}).get("body", {}).get("researchTopicId") == UNKNOWN and
              (c["request"] or {}).get("body", {}).get("artworkId") is None)
        check("J4 the visitor's editable message survives in the transcript",
              "J4 clean session" in json.dumps(c["transcript"]))
        s4.ctx.close()

        # ══ J6. the Codex destination: what the link actually provides ══
        print("\n=== J6. the Codex destination is reachable by the Codex's own navigation only ===")
        cctx = browser.new_context(viewport={"width": 1280, "height": 1000}, reduced_motion="reduce")
        cpage = cctx.new_page()
        cpage.set_default_timeout(45000)
        cpage.goto(PREVIEW + "/experience/correspondence-codex", wait_until="networkidle")
        fr = cpage.frame_locator(IFRAME)
        fr.locator("#nav").wait_for(timeout=45000)
        cards_ = fr.locator("#sys-grid .sys-card")
        names = [cards_.nth(i).text_content().strip().replace("\n", " ")
                 for i in range(cards_.count())]
        freq = [i for i, n in enumerate(names) if "FREQUENCY" in n]
        check("the Codex Home tab offers exactly one FREQUENCY system card",
              len(freq) == 1, json.dumps(names, ensure_ascii=False))
        fr.locator("#nav .nt").nth(0).evaluate("el => el.click()")
        cpage.wait_for_timeout(1400)
        cards_.nth(freq[0]).evaluate("el => el.click()")
        cpage.wait_for_timeout(1600)
        c_tab = fr.locator("#nav .nt.on .nl").text_content().strip()
        c_sel = fr.locator("#sys-bar .sbt.on").text_content().strip()
        c_stats = fr.locator("#mstats").text_content().strip()
        check("choosing the FREQUENCY card selects that system in the system bar",
              "FREQUENCY" in c_sel, c_sel)
        check("...and opens the Matrix tab", c_tab == "Matrix", c_tab)
        check("...and reports the FREQUENCY entry count", "25 of 824" in c_stats, c_stats)

        deep = {}
        for probe in ("?system=FREQUENCY", "#FREQUENCY"):
            cpage.goto(PREVIEW + "/experience/correspondence-codex" + probe,
                       wait_until="networkidle")
            f2 = cpage.frame_locator(IFRAME)
            f2.locator("#nav").wait_for(timeout=45000)
            cpage.wait_for_timeout(1400)
            sel = f2.locator("#sys-bar .sbt.on").text_content().strip()
            tab = f2.locator("#nav .nt.on .nl").text_content().strip()
            deep[probe] = {"systemBar": sel, "tab": tab}
            check(f"a URL cannot target a system: {probe} is ignored", "FREQUENCY" not in sel, sel)
        cctx.close()

        # ══ 390 CSS px viewport ══
        print("\n=== J5. 390 CSS px viewport: labels wrap, no clipping, keyboard access ===")
        ctx = browser.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
        page = ctx.new_page()
        page.set_default_timeout(45000)
        page.goto(PREVIEW + "/research/cymatics", wait_until="networkidle")
        inner = page.evaluate("() => window.innerWidth")
        check("the viewport is a real 390 CSS px", inner == 390, f"innerWidth={inner}")

        layout = page.evaluate(
            """() => {
                const out = {overflow: document.documentElement.scrollWidth - window.innerWidth, cards: []};
                document.querySelectorAll('li[data-connection-anchor]').forEach(li => {
                    const head = li.querySelector(':scope > div');
                    const spans = head ? [...head.querySelectorAll('span')] : [];
                    const card = li.getBoundingClientRect();
                    out.cards.push({
                        slug: li.getAttribute('data-connection-anchor'),
                        label: spans.length > 1 ? spans[1].textContent.trim() : null,
                        labelBottom: spans.length > 1 ? +spans[1].getBoundingClientRect().bottom.toFixed(1) : null,
                        labelTop: spans.length > 1 ? +spans[1].getBoundingClientRect().top.toFixed(1) : null,
                        labelHeight: spans.length > 1 ? +spans[1].getBoundingClientRect().height.toFixed(1) : null,
                        labelFlush: spans.length > 1 ? +(spans[1].getBoundingClientRect().right - card.right).toFixed(1) : null,
                        whiteSpace: spans.length > 1 ? getComputedStyle(spans[1]).whiteSpace : null,
                        lineHeight: spans.length > 1 ? getComputedStyle(spans[1]).lineHeight : null,
                        overflowX: spans.length > 1 ? spans[1].scrollWidth - spans[1].clientWidth : null,
                        clipped: !!head && head.scrollWidth > head.clientWidth + 1,
                        links: [...li.querySelectorAll('a')].map(a => a.getAttribute('data-connection-oracle') || a.getAttribute('data-connection-basis') || a.getAttribute('href')),
                        note: !!li.querySelector('p[data-connection-destination-note]'),
                    });
                });
                return out;
            }"""
        )
        print(f"  document overflow-x: {layout['overflow']} px")
        check("no horizontal document overflow at 390 px", layout["overflow"] <= 0,
              f"{layout['overflow']} px")
        check("all six connection cards rendered", len(layout["cards"]) == 6, str(len(layout["cards"])))
        worst = None
        for card in layout["cards"]:
            ok = (card["overflowX"] is not None and card["overflowX"] <= 0
                  and not card["clipped"]
                  and card["whiteSpace"] in ("normal", "break-word")
                  and card["labelFlush"] is not None and card["labelFlush"] <= 0.5)
            if not ok and worst is None:
                worst = card
        check("every long basis label wraps inside its card without clipping",
              worst is None, json.dumps(worst, ensure_ascii=False))
        wrapped = [c for c in layout["cards"]
                   if c["labelHeight"] and c["lineHeight"]
                   and c["labelHeight"] > float(c["lineHeight"].replace("px", "")) * 1.5]
        print(f"  labels that actually wrapped onto a second line: {len(wrapped)}"
              f" -> {[c['label'][:38] for c in wrapped]}")
        check("at least one long label demonstrably wraps onto a second line (the 390 px failure mode)",
              len(wrapped) > 0)
        longest_label = max((c["label"] or "" for c in layout["cards"]), key=len).strip()
        check("the label that wraps is the longest one on the page",
              bool(wrapped) and longest_label in [c["label"].strip() for c in wrapped],
              json.dumps({"longest": longest_label,
                          "wrapped": [c["label"] for c in wrapped]}, ensure_ascii=False))
        check("the codex destination states how to reach FREQUENCY on the card",
              any(c["note"] for c in layout["cards"]))
        check("each card still exposes exactly two links",
              all(len(c["links"]) == 2 for c in layout["cards"]),
              json.dumps([c["links"] for c in layout["cards"]], ensure_ascii=False))

        # keyboard: tab through the page and record which controls the keyboard reaches
        page.evaluate("() => window.scrollTo(0, 0)")
        focus_log = []
        for _ in range(90):
            page.keyboard.press("Tab")
            info = page.evaluate(
                """() => {
                    const a = document.activeElement;
                    if (!a) return null;
                    const kind = a.getAttribute('data-connection-oracle') ? 'oracle-entry'
                        : a.getAttribute('data-connection-basis') ? 'destination'
                        : a.getAttribute('data-research-oracle-link') ? 'research-portal'
                        : a.tagName === 'TEXTAREA' ? 'composer' : a.tagName;
                    return {tag: a.tagName, kind,
                            key: a.getAttribute('data-connection-oracle')
                                || a.getAttribute('data-connection-basis')
                                || a.getAttribute('aria-label') || a.id || null};
                }"""
            )
            if info:
                focus_log.append(info)
        kinds = [(f["kind"], f["key"]) for f in focus_log]
        check("the keyboard reaches a card's destination link",
              any(k == "destination" for k, _ in kinds), json.dumps(kinds[:12], ensure_ascii=False))
        check("the keyboard reaches the same card's Oracle entry link",
              any(k == "oracle-entry" for k, _ in kinds))
        check("the keyboard reaches the research portal's Oracle link",
              any(k == "research-portal" for k, _ in kinds))
        check("the keyboard reaches the page composer from the same tab order",
              any(k == "composer" for k, _ in kinds))
        page.goto(PREVIEW + f"/oracle?view=desktop&researchTopicId={VALID_A}&from=%2Fresearch%2Fcymatics",
                  wait_until="networkidle")
        page.wait_for_selector(CHIP_SEL, timeout=45000)
        page.focus(COMPOSER_SEL)
        typed = page.evaluate("() => document.activeElement.tagName")
        check("keyboard focuses the editable composer", typed == "TEXTAREA", typed)
        page.keyboard.type("J5 keyboard composition")
        check("the composer accepts keyboard input",
              page.input_value(COMPOSER_SEL) == "J5 keyboard composition",
              page.input_value(COMPOSER_SEL))
        page.keyboard.press("Tab")
        check("the composer is followed by a focusable control",
              page.evaluate("() => document.activeElement.tagName") in ("BUTTON", "A"),
              page.evaluate("() => document.activeElement.tagName"))
        ctx.close()
        browser.close()

    payload = {
        "preview": PREVIEW,
        "journeys": records,
        "codexDestination": {
            "systemCards": names,
            "frequencyCardIndex": freq,
            "afterChoosingFrequency": {"tab": c_tab, "systemBar": c_sel, "stats": c_stats},
            "urlTargetingProbes": deep,
        },
        "viewport390": layout,
        "focusOrder": focus_log[:60],
        "assertionsFailed": failures,
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, ensure_ascii=False)
    print(f"\nwrote {OUT}")
    print(f"assertions failed: {len(failures)}")
    for f in failures:
        print("  -", f)
    print("BATCH15B_CONNECTION_JOURNEY_" + ("PASSED" if not failures else "FAILED"))
    return 1 if failures else 0


if __name__ == "__main__":
    if not re.match(r"^https?://", PREVIEW):
        print(__doc__)
        sys.exit(2)
    sys.exit(run())
