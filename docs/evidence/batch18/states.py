import json, os, sys
from playwright.sync_api import sync_playwright
BASE=sys.argv[1].rstrip("/"); SLUGS=sys.argv[2:]
SHOTS="/root/b18/screens"; os.makedirs(SHOTS, exist_ok=True)
checks=[]
def check(l,c,d=None):
    checks.append({"check":l,"ok":bool(c),"detail":str(d)[:300] if d is not None else None})
    print(f"  {'ok  ' if c else 'FAIL'} {l}"+(f" — {d}" if d and not c else ""))
with sync_playwright() as pw:
    b=pw.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    for slug in SLUGS:
        print(f"\n=== states: {slug} ===")
        # 390 px
        ctx=b.new_context(viewport={"width":390,"height":844},device_scale_factor=3,is_mobile=True,has_touch=True)
        p=ctx.new_page(); p.set_default_timeout(90000)
        p.goto(f"{BASE}/gallery/{slug}",wait_until="domcontentloaded")
        p.wait_for_selector("[data-artwork-hero='true']",timeout=60000); p.wait_for_timeout(4000)
        m=p.evaluate("""() => ({ inner: innerWidth,
            overflow: document.documentElement.scrollWidth > innerWidth+1,
            heroFits:(()=>{const f=document.querySelector('[data-hero-frame="true"]');if(!f)return null;const r=f.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1;})(),
            focus:(()=>{const f=document.querySelector('[data-hero-frame="true"]');if(!f)return 0;const r=f.getBoundingClientRect();return +(Math.min(r.bottom,innerHeight)-Math.max(r.top,0))/innerHeight;})(),
            tap:(()=>{const x=document.querySelector('[data-hero-inspect="true"]');if(!x)return null;const r=x.getBoundingClientRect();return r.height>=40&&r.left>=-1&&r.right<=innerWidth+1;})() })""")
        check("390: real 390 CSS px viewport", m["inner"]==390, m["inner"])
        check("390: no horizontal overflow", not m["overflow"])
        check("390: the hero fits", m["heroFits"])
        check("390: artwork still dominates the first screen", m["focus"]>=0.3, m["focus"])
        check("390: inspection control is tappable", m["tap"])
        p.screenshot(path=os.path.join(SHOTS,f"b18-{slug}-390.png")); ctx.close()
        # slow network
        ctx=b.new_context(viewport={"width":1280,"height":900}); p=ctx.new_page(); p.set_default_timeout(120000)
        slow=[]; p.on("request",lambda r: slow.append(r.url))
        cdp=ctx.new_cdp_session(p); cdp.send("Network.enable")
        cdp.send("Network.emulateNetworkConditions",{"offline":False,"latency":400,
            "downloadThroughput":int(400*1024/8),"uploadThroughput":int(200*1024/8)})
        p.goto(f"{BASE}/gallery/{slug}",wait_until="domcontentloaded")
        p.wait_for_selector("[data-artwork-hero='true']",timeout=120000)
        shown=False
        for _ in range(40):
            shown=p.evaluate("""() => {const i=document.querySelector('[data-hero-frame="true"] img');
                                       return !!(i&&i.complete&&i.naturalWidth>0);}""")
            if shown: break
            p.wait_for_timeout(500)
        mp=f"/artworks/{slug}/main.jpg"
        from urllib.parse import unquote
        raw_master=[u for u in slow if mp in unquote(u) and "/_next/image" not in u]
        check("slow network: the preview becomes visible", shown)
        check("slow network: the master is still not requested", not raw_master, raw_master[:1])
        ctx.close()
        # image failure
        ctx=b.new_context(viewport={"width":1280,"height":900}); p=ctx.new_page(); p.set_default_timeout(60000)
        p.route("**/_next/image**", lambda r: r.abort())
        p.goto(f"{BASE}/gallery/{slug}",wait_until="domcontentloaded")
        p.wait_for_selector("[data-artwork-hero='true']",timeout=60000)
        failed=False
        for _ in range(20):
            failed=p.query_selector("[data-hero-error='true']") is not None
            if failed: break
            p.wait_for_timeout(500)
        check("failure: a blocked preview says so, no broken image", failed)
        check("failure: the rest of the page still renders", p.query_selector("[data-artwork-oracle='true']") is not None)
        ctx.close()
    b.close()
tot=len(checks); ok=sum(1 for c in checks if c["ok"])
print(f"\n=== STATES TOTAL: {ok} / {tot} ===")
json.dump({"base":BASE,"checks":checks,"passed":ok,"total":tot,
           "failed":[c["check"] for c in checks if not c["ok"]]}, open("/root/b18/states.json","w"), indent=2)
