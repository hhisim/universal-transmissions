#!/usr/bin/env python3
"""f_return.py — the return leg of the journey, verified on its own.

The full journey script carries an instrument launch and a complete Oracle exchange before
this step, and this 2-core host has been SIGTERMing it there. The return leg does not
depend on any of that, so it is checked directly rather than inferred from a crashed run.
"""
import json, os, sys
from helper import BASE, check, page_shot, results, save
from playwright.sync_api import sync_playwright
G = "5b. return to research"
with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    p = b.new_context(viewport={"width":1400,"height":950}).new_page()
    p.set_default_timeout(120000)
    p.goto(BASE + "/research/cymatics", wait_until="domcontentloaded")
    p.wait_for_selector("[data-cymatics-connections='true']", state="visible")
    check("the instrument room is reachable from Cymatics research",
          p.query_selector("a[href='/experience/universal-resonator']") is not None, None, G)
    anchors = p.eval_on_selector_all("[data-cymatics-connections='true'] [data-connection-anchor]",
                                     "els => els.map(e => e.getAttribute('data-connection-anchor'))")
    check("the instrument is listed as a connection of the room",
          "instrument-universal-resonator" in anchors, json.dumps(anchors), G)
    check("the six released anchors are still there, in order",
          anchors[:6] == ["journal-cymatics-language-of-form","artwork-throat-chakra",
                          "artwork-recursive-pantheism","codex-frequency-lattice",
                          "artwork-hyperdimensional-harmonics","journal-kybalion-seven-principles"],
          json.dumps(anchors), G)
    p.click("a[href='/experience/universal-resonator']")
    p.wait_for_selector("[data-instrument-room='true']", timeout=90000)
    check("following it lands on the instrument room",
          "/experience/universal-resonator" in p.url, p.url, G)
    p.click("[data-instrument-return='true']")
    p.wait_for_selector("[data-cymatics-connections='true']", timeout=90000)
    check("the room returns to Cymatics research", "/research/cymatics" in p.url, p.url, G)
    page_shot(p, "e12-returned-to-research.png")
    save("/root/b17/acceptance/f_results.json")
    b.close()
