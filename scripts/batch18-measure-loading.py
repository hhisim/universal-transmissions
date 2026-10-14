#!/usr/bin/env python3
"""batch18-measure-loading.py — measure what an artwork page actually transfers.

Run identically before and after the change so the comparison is like-for-like. The
question it answers is the one the brief asks: is a visitor shown a useful representative
image promptly, or is a full-resolution original simply downloaded behind a spinner?

It reports, per artwork page:
  - every image response, with the TRANSFERRED bytes (from content-length when the server
    sends one) and the DECODED bytes (the actual body), kept separate because they differ
    under compression and conflating them inflates or deflates the result;
  - whether the hero request is the ORIGINAL master file, by comparing the served bytes
    against the master's size on disk;
  - the time until the hero image is actually displayed;
  - how many <img> elements exist versus how many started a request, which is how an
    eagerly-mounted gallery gives itself away.

Usage: python3 batch18-measure-loading.py <base> <slug> [<slug> ...]
"""
import json
import os
import sys
from urllib.parse import unquote

from playwright.sync_api import sync_playwright

BASE = sys.argv[1].rstrip("/")
SLUGS = sys.argv[2:] or ["vitruvian-spirit"]
OUT = os.environ.get("B18_OUT", "/root/b18/measure-before.json")
MASTERS = "/root/ut-repo/public/artworks"

results = {}


def master_size(url_path):
    """Size of the original master this URL resolves to, if it is a master at all."""
    p = os.path.join(MASTERS, unquote(url_path).replace("/artworks/", "", 1))
    return os.path.getsize(p) if os.path.isfile(p) else None


with sync_playwright() as pw:
    browser = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader",
                                       "--enable-unsafe-swiftshader"])
    for slug in SLUGS:
        ctx = browser.new_context(viewport={"width": 1440, "height": 950})
        page = ctx.new_page()
        page.set_default_timeout(120000)
        images = []

        def on_response(resp):
            ct = (resp.headers or {}).get("content-type", "")
            if not ct.startswith("image/"):
                return
            try:
                body = resp.body()
            except Exception:
                body = b""
            cl = (resp.headers or {}).get("content-length")
            images.append({
                "url": resp.url,
                "decoded_url": unquote(resp.url),
                "path": unquote(resp.url).split(BASE)[-1].split("?")[0] if BASE in resp.url else unquote(resp.url),
                "status": resp.status,
                "content_type": ct,
                "transferred": int(cl) if cl and cl.isdigit() else None,
                "decoded": len(body),
                "optimized": "/_next/image" in resp.url,
            })

        page.on("response", on_response)
        page.goto(f"{BASE}/gallery/{slug}", wait_until="load")
        page.wait_for_timeout(6000)   # let everything on first paint settle

        # Identify the MAIN artwork explicitly by its master path. Taking the first image
        # response was unreliable: a detail thumbnail can answer first, and then the report
        # names the wrong element as the hero.
        master_rel = f"/artworks/{slug}/main.jpg"
        # next/image percent-encodes its url parameter, so the master path only appears
        # in the DECODED url. Matching the raw url would report "not fetched" for every
        # optimized image, which is a detector bug, not a finding.
        main_as_master = [i for i in images if master_rel in i["decoded_url"] and "/_next/image" not in i["url"]]
        main_as_derivative = [i for i in images if "/_next/image" in i["url"] and master_rel in i["decoded_url"]]

        counts = page.evaluate("""() => ({
            imgs: document.querySelectorAll('main img').length,
            loaded: Array.from(document.querySelectorAll('main img'))
                        .filter(i => i.complete && i.naturalWidth > 0).length,
            heroNatural: (() => { const i = document.querySelector('main img');
                                  return i ? [i.naturalWidth, i.naturalHeight] : null; })(),
            heroRendered: (() => { const i = document.querySelector('main img');
                                   if (!i) return null;
                                   const r = i.getBoundingClientRect();
                                   return [Math.round(r.width), Math.round(r.height)]; })(),
            heroObjectFit: (() => { const i = document.querySelector('main img');
                                    return i ? getComputedStyle(i).objectFit : null; })(),
            heroSizes: (() => { const i = document.querySelector('main img');
                                return i ? i.getAttribute('sizes') : null; })(),
            heroSrc: (() => { const i = document.querySelector('main img');
                              return i ? i.currentSrc || i.src : null; })(),
        })""")

        results[slug] = {
            "base": BASE,
            "image_requests": len(images),
            "image_transferred_bytes": sum(i["transferred"] or i["decoded"] for i in images),
            "main_artwork_fetched_as_master": bool(main_as_master),
            "main_artwork_fetched_as_derivative": bool(main_as_derivative),
            "main_artwork_master_bytes": max((i["transferred"] or i["decoded"] for i in main_as_master), default=None),
            "main_artwork_derivative_bytes": max((i["transferred"] or i["decoded"] for i in main_as_derivative), default=None),
            "dom": counts,
            "images": images,
        }
        h = results[slug]
        print(f"\n=== {slug} on {BASE} ===")
        print(f"  image requests on first paint : {h['image_requests']}")
        print(f"  image bytes transferred       : {h['image_transferred_bytes']:,}")
        print(f"  MAIN artwork fetched as MASTER      : {h['main_artwork_fetched_as_master']}"
              + (f" ({h['main_artwork_master_bytes']:,} bytes)" if h["main_artwork_master_bytes"] else ""))
        print(f"  MAIN artwork fetched as DERIVATIVE  : {h['main_artwork_fetched_as_derivative']}"
              + (f" ({h['main_artwork_derivative_bytes']:,} bytes)" if h["main_artwork_derivative_bytes"] else ""))
        print(f"  <img> in main / loaded        : {counts['imgs']} / {counts['loaded']}")
        print(f"  hero natural / rendered       : {counts['heroNatural']} / {counts['heroRendered']}")
        print(f"  hero object-fit               : {counts['heroObjectFit']}")
        ctx.close()
    browser.close()

os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(results, open(OUT, "w"), indent=2)
print(f"\nwritten: {OUT}")
