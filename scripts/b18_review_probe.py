#!/usr/bin/env python3
"""b18_review_probe.py — collect the Batch 18 review-package evidence for one work.

Targeted collection, not a re-verification: it records the raw request rows, the mobile
metrics together, the states, and the contextual Oracle journey for a single work, then
writes JSON plus captures. One work per invocation, because this host SIGTERMs long runs.

Usage: python3 b18_review_probe.py <base> <slug>
"""
import json
import os
import sys
from urllib.parse import unquote

from playwright.sync_api import sync_playwright

BASE = sys.argv[1].rstrip("/")
SLUG = sys.argv[2]
OUTDIR = "/root/b18/review"
SHOTS = os.path.join(OUTDIR, "captures")
os.makedirs(SHOTS, exist_ok=True)
MASTER = f"/artworks/{SLUG}/main.jpg"


def shot(target, path):
    """Capture a screenshot reliably.

    Playwright's screenshot waits for the page to stop animating, which never happens on a
    page with a live background canvas; on this host that surfaces as "Unable to capture
    screenshot". Prefer a CDP capture, which does not wait for stability, and fall back to
    a motion-disabled screenshot if the CDP path is unavailable.
    """
    try:
        cdp = target.context.new_cdp_session(target)
        cdp.send("Page.enable")
        data = cdp.send("Page.captureScreenshot", {"format": "png"})
        import base64
        open(path, "wb").write(base64.b64decode(data["data"]))
        return True
    except Exception:
        pass
    try:
        target.screenshot(path=path, animations="disabled", timeout=30000)
        return True
    except Exception as e:
        print(f"  [screenshot failed] {path}: {str(e)[:120]}")
        return False

rec = {"slug": SLUG, "base": BASE}
PHASES = []


def save():
    """Persist what has been collected so far.

    This host SIGTERMs long runs, and a single write at the end loses everything gathered
    before the kill. Saving after every phase means an interrupted run still yields the
    phases it completed, and the interruption is recorded rather than hidden.
    """
    json.dump(rec, open(os.path.join(OUTDIR, f"{SLUG}.json"), "w"), indent=2)

# Which originals this work could request, with their true on-disk sizes, so a request can
# be classified as "the master" rather than guessed at.
def master_bytes(rel):
    p = os.path.join("/root/ut-repo/public", rel.lstrip("/"))
    return os.path.getsize(p) if os.path.isfile(p) else None


with sync_playwright() as pw:
    browser = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader",
                                       "--enable-unsafe-swiftshader"])

    # ── desktop: request records + first-screen composition ────────────────
    ctx = browser.new_context(viewport={"width": 1440, "height": 950})
    page = ctx.new_page()
    page.set_default_timeout(90000)
    rows = []

    def on_response(resp):
        ct = (resp.headers or {}).get("content-type", "")
        if not ct.startswith("image/"):
            return
        try:
            body = resp.body()
        except Exception:
            body = b""
        h = resp.headers or {}
        u = resp.url
        du = unquote(u)
        is_opt = "/_next/image" in u
        rel = du.split(BASE)[-1].split("?")[0] if BASE in du else du
        rows.append({
            "url": u,
            "path": rel,
            "optimized": is_opt,
            "requested_as_original_master": (MASTER in du) and not is_opt,
            "master_on_disk_bytes": master_bytes(rel) if not is_opt else None,
            "transferred_bytes": int(h["content-length"]) if h.get("content-length", "").isdigit() else None,
            "decoded_bytes": len(body),
            "content_type": ct,
            "cache_control": h.get("cache-control"),
            "vercel_cache": h.get("x-vercel-cache"),
            "age": h.get("age"),
            "etag": h.get("etag"),
        })

    page.on("response", on_response)
    page.goto(f"{BASE}/gallery/{SLUG}", wait_until="load")
    page.wait_for_timeout(7000)

    rec["desktop_first_screen"] = page.evaluate("""() => {
        const f = document.querySelector('[data-hero-frame="true"]');
        const img = f ? f.querySelector('img') : null;
        const r = f ? f.getBoundingClientRect() : null;
        return {
            viewport: [innerWidth, innerHeight],
            hero_box: r ? [Math.round(r.width), Math.round(r.height)] : null,
            hero_aspect: r ? +(r.width / r.height).toFixed(3) : null,
            hero_share_of_first_screen: r
                ? +((Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) / innerHeight).toFixed(3) : null,
            hero_served_dimensions: img ? [img.naturalWidth, img.naturalHeight] : null,
            hero_rendered_dimensions: img ? [img.clientWidth, img.clientHeight] : null,
            hero_object_fit: img ? getComputedStyle(img).objectFit : null,
            hero_current_src: img ? (img.currentSrc || img.src) : null,
        };
    }""")
    shot(page, os.path.join(SHOTS, f"{SLUG}-desktop-first-screen.png"))
    save()

    # ── detail loading state (before any reveal) ───────────────────────────
    rec["detail_state"] = page.evaluate("""() => {
        const g = document.querySelector('[data-detail-grid="true"]');
        const c = document.querySelector('[data-detail-count="true"]');
        const more = document.querySelector('[data-explore-more="true"]');
        return {
            mounted_thumbs: g ? g.querySelectorAll('li').length : null,
            counter: c ? c.textContent.trim() : null,
            has_reveal_control: !!more,
            reveal_copy: (document.querySelector('[data-reveal-copy="true"]')||{}).textContent || null,
        };
    }""")
    if page.query_selector("[data-detail-grid='true']"):
        page.eval_on_selector("[data-detail-grid='true']", "e => e.scrollIntoView({block:'center'})")
        page.wait_for_timeout(2500)
        shot(page, os.path.join(SHOTS, f"{SLUG}-detail-loading.png"))
        before = page.evaluate("() => document.querySelectorAll('[data-detail-grid=\"true\"] li').length")
        if page.query_selector("[data-explore-more='true']"):
            page.click("[data-explore-more='true']")
            page.wait_for_timeout(3000)
        after = page.evaluate("() => document.querySelectorAll('[data-detail-grid=\"true\"] li').length")
        rec["detail_state"]["after_one_reveal"] = {"mounted_before": before, "mounted_after": after}
        save()

    # ── composition capture at page top ────────────────────────────────────
    page.evaluate("() => window.scrollTo(0, 0)")
    page.wait_for_timeout(1200)

    # ── animated works: the transcription video must still be there ────────
    rec["animation"] = page.evaluate("""() => {
        const v = document.querySelector('[data-transcription-video], .transcription-video, iframe[src*="youtube"], iframe[src*="youtu"]');
        return {
            present: !!v,
            tag: v ? v.tagName : null,
            src: v ? (v.getAttribute('src') || v.getAttribute('data-src')) : null,
            title: v ? (v.getAttribute('title') || null) : null,
            loading: v ? v.getAttribute('loading') : null,
            wrapper_visible: v ? v.getBoundingClientRect().height > 0 : null,
        };
    }""")

    # ── inspection state ───────────────────────────────────────────────────
    insp = {"opened": False}
    try:
        page.eval_on_selector("[data-hero-inspect='true']", "e => e.scrollIntoView({block:'center'})")
        page.wait_for_timeout(800)
        page.click("[data-hero-inspect='true']")
        page.wait_for_selector("[role='dialog']", timeout=45000)
        page.wait_for_timeout(5000)
        insp = page.evaluate("""() => {
            const d = document.querySelector('[role="dialog"]');
            const img = d ? d.querySelector('img') : null;
            return { opened: true,
                     served_dimensions: img ? [img.naturalWidth, img.naturalHeight] : null,
                     served_src: img ? (img.currentSrc || img.src) : null,
                     zoom_control: (document.querySelector('[data-lightbox-zoom="true"]')||{}).textContent || null };
        }""")
        shot(page, os.path.join(SHOTS, f"{SLUG}-inspection.png"))
        page.keyboard.press("Escape")
        page.wait_for_timeout(1200)
    except Exception as e:
        insp["error"] = str(e)[:200]
    rec["inspection"] = insp
    rec["image_requests_desktop"] = rows
    save()

    # ── image-failure / retry state ────────────────────────────────────────
    ctx2 = browser.new_context(viewport={"width": 1440, "height": 950})
    p2 = ctx2.new_page()
    p2.set_default_timeout(60000)
    p2.route("**/_next/image**", lambda r: r.abort())
    p2.goto(f"{BASE}/gallery/{SLUG}", wait_until="domcontentloaded")
    p2.wait_for_selector("[data-artwork-hero='true']", timeout=60000)
    for _ in range(20):
        if p2.query_selector("[data-hero-error='true']"):
            break
        p2.wait_for_timeout(500)
    rec["failure_state"] = p2.evaluate("""() => {
        const e = document.querySelector('[data-hero-error="true"]');
        return { shown: !!e,
                 text: e ? e.innerText.replace(/\\s+/g,' ').trim() : null,
                 retry_present: !!(e && e.querySelector('button')),
                 page_still_renders: !!document.querySelector('[data-artwork-oracle="true"]') };
    }""")
    shot(p2, os.path.join(SHOTS, f"{SLUG}-image-failure.png"))
    # retry: stop aborting and press retry
    try:
        p2.unroute("**/_next/image**")
        if p2.query_selector("[data-hero-error='true'] button"):
            p2.click("[data-hero-error='true'] button")
            for _ in range(24):
                st = p2.evaluate("""() => { const i=document.querySelector('[data-hero-frame="true"] img');
                                            return !!(i && i.complete && i.naturalWidth>0); }""")
                if st:
                    break
                p2.wait_for_timeout(500)
            rec["failure_state"]["retry_recovered"] = st
            rec["failure_state"]["retry_served"] = p2.evaluate(
                """() => { const i=document.querySelector('[data-hero-frame="true"] img');
                           return i ? [i.naturalWidth, i.naturalHeight] : null; }""")
            shot(p2, os.path.join(SHOTS, f"{SLUG}-retry-recovered.png"))
    except Exception as e:
        rec["failure_state"]["retry_error"] = str(e)[:200]
    ctx2.close()
    save()

    # ── mobile: metrics reported TOGETHER, no substitution ─────────────────
    ctx3 = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=3,
                               is_mobile=True, has_touch=True)
    p3 = ctx3.new_page()
    p3.set_default_timeout(90000)
    p3.goto(f"{BASE}/gallery/{SLUG}", wait_until="load")
    p3.wait_for_selector("[data-artwork-hero='true']", timeout=60000)
    p3.wait_for_timeout(6000)
    rec["mobile"] = p3.evaluate("""() => {
        const f = document.querySelector('[data-hero-frame="true"]');
        const r = f ? f.getBoundingClientRect() : null;
        const vv = window.visualViewport;
        return {
            configured_viewport: [390, 844],
            innerWidth: innerWidth,
            innerHeight: innerHeight,
            documentElement_clientWidth: document.documentElement.clientWidth,
            documentElement_scrollWidth: document.documentElement.scrollWidth,
            body_clientWidth: document.body.clientWidth,
            body_scrollWidth: document.body.scrollWidth,
            visualViewport_width: vv ? +vv.width.toFixed(2) : null,
            visualViewport_height: vv ? +vv.height.toFixed(2) : null,
            visualViewport_scale: vv ? +vv.scale.toFixed(4) : null,
            devicePixelRatio: devicePixelRatio,
            viewport_meta: (document.querySelector('meta[name=viewport]')||{}).content || null,
            hero_box: r ? [Math.round(r.width), Math.round(r.height)] : null,
            hero_share_of_first_screen: r
                ? +((Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) / innerHeight).toFixed(3) : null,
            hero_object_fit: (f && f.querySelector('img')) ? getComputedStyle(f.querySelector('img')).objectFit : null,
            widest_element: (() => { let w = 0, el = null;
                document.querySelectorAll('body *').forEach(e => { const b = e.getBoundingClientRect();
                    if (b.right > w) { w = b.right; el = e.tagName + (e.id ? '#' + e.id : ''); } });
                return [Math.round(w), el]; })(),
            overflows_configured_viewport: document.documentElement.scrollWidth > 390,
        };
    }""")
    shot(p3, os.path.join(SHOTS, f"{SLUG}-mobile-first-screen.png"))
    ctx3.close()
    save()

    # ── contextual Oracle: question, response, return path ─────────────────
    ctx4 = browser.new_context(viewport={"width": 1440, "height": 950})
    p4 = ctx4.new_page()
    p4.set_default_timeout(120000)
    p4.goto(f"{BASE}/gallery/{SLUG}", wait_until="domcontentloaded")
    p4.wait_for_selector("[data-artwork-oracle='true']", timeout=60000)
    href = p4.get_attribute("[data-artwork-oracle='true']", "href")
    dhref = unquote(href or "")
    from urllib.parse import parse_qs, urlparse
    qs = parse_qs(urlparse(dhref).query)
    orec = {"entry_href": href, "entry_href_decoded": dhref,
            "question": (qs.get("q") or [""])[0],
            "artwork_id": (qs.get("artworkId") or [""])[0],
            "return_param": (qs.get("from") or [""])[0]}
    try:
        p4.goto(BASE + href, wait_until="domcontentloaded")
        p4.wait_for_timeout(9000)
        orec["return_link"] = p4.evaluate("""() => {
            const a = Array.from(document.querySelectorAll('a')).find(x => /RETURN TO ARTWORK/i.test(x.textContent||''));
            return a ? { text: a.textContent.trim(), href: a.getAttribute('href') } : null;
        }""")
        # The response may need a moment; capture whatever the page renders.
        text = ""
        for _ in range(40):
            text = p4.evaluate("""() => {
                const nodes = document.querySelectorAll('[data-oracle-answer], .oracle-answer, [role="log"], main');
                let best = '';
                nodes.forEach(n => { const t = (n.innerText||'').trim(); if (t.length > best.length) best = t; });
                return best;
            }""")
            if "ORACLE" in (text or "").upper() and len(text) > 500:
                break
            p4.wait_for_timeout(1500)
        orec["rendered_text_chars"] = len(text or "")
        orec["response_excerpt"] = (text or "")[-2500:]
        shot(p4, os.path.join(SHOTS, f"{SLUG}-oracle.png"))
        # follow the return link
        ok = p4.evaluate("""() => {
            const a = Array.from(document.querySelectorAll('a')).find(x => /RETURN TO ARTWORK/i.test(x.textContent||''));
            if (!a) return null;
            a.click(); return a.getAttribute('href');
        }""")
        if ok:
            p4.wait_for_timeout(6000)
            orec["returned_to"] = p4.url
            orec["return_landed_on_artwork"] = f"/gallery/{SLUG}" in p4.url
            shot(p4, os.path.join(SHOTS, f"{SLUG}-returned.png"))
    except Exception as e:
        orec["error"] = str(e)[:300]
    rec["oracle"] = orec
    ctx4.close()
    save()
    browser.close()

json.dump(rec, open(os.path.join(OUTDIR, f"{SLUG}.json"), "w"), indent=2)
print(json.dumps({k: v for k, v in rec.items() if k != "image_requests_desktop"}, indent=2)[:3000])
print(f"\nrequests recorded: {len(rec.get('image_requests_desktop', []))}")
