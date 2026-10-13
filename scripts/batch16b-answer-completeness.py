#!/usr/bin/env python3
"""batch16b-answer-completeness.py — the answer a visitor actually receives.

The review found a visitor-visible cutoff: a response ending mid-sentence on the wire
("...The frequency and spin assignments in particular are"). The cause was upstream of
this repo — the Oracle backend's codex token budget, where the model's reasoning shares
the same pool as its answer, and only EMPTY content was retried. This script is the
guard against a regression: it drives the deployed route the way the browser does and
requires every answer to end at a sentence boundary.

It also checks what the answer SAYS, because metadata and length are not evidence:
that it addresses the selected relationship, keeps documentation apart from
interpretation, and does not attribute sources it was never given.

Usage:
  python3 scripts/batch16b-answer-completeness.py <base-url> [runs] [out.json]
"""
import json
import re
import sys
import time
import urllib.error
import urllib.request

ANCHOR = "research-v1:geometry/connection/artwork-tetra"
OPENING = "Why does this series start from the tetrahedron rather than one of the other four solids?"
FOLLOW_UP = "Which parts of what you just told me are documented, and which parts are the archive's own reading?"

# Authors/works that are NOT in this connection's grounding and must never be
# attributed to it. "Lawlor" appears nowhere in the repository at all.
UNSUPPLIED = ["lawlor", "buckminster", "fuller", "blavatsky", "schwaller"]

passed = failed = 0


def chk(label, cond, detail=None):
    global passed, failed
    if cond:
        passed += 1
        print(f"  ok   {label}")
    else:
        failed += 1
        print(f"  FAIL {label}" + (f" — {detail}" if detail else ""))


def ask(base, message, history=None):
    payload = {"message": message, "mode": "oracle", "lang": "en", "speed": "fast",
               "researchTopicId": ANCHOR}
    if history:
        payload["history"] = history
    req = urllib.request.Request(f"{base}/api/oracle", data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return r.status, json.loads(r.read().decode()), round(time.time() - t0, 1)
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode()[:200]}, round(time.time() - t0, 1)


def ends_at_sentence(text):
    return bool(re.search(r"[.!?…\"'”’)\]]\s*$", text.strip()))


def main():
    base = (sys.argv[1] if len(sys.argv) > 1 else "").rstrip("/")
    runs = int(sys.argv[2]) if len(sys.argv) > 2 else 2
    out = sys.argv[3] if len(sys.argv) > 3 else "/root/b16b/answer-completeness.json"
    if not base:
        print("usage: batch16b-answer-completeness.py <base-url> [runs] [out.json]")
        return 2

    print(f"base: {base}\nruns: {runs}\n")
    records = []
    for n in range(1, runs + 1):
        print(f"=== run {n}: the opening question ===")
        st, d1, el1 = ask(base, OPENING)
        if not isinstance(d1, dict):
            d1 = {}
        a1 = d1.get("response") or ""
        chk(f"run {n}: the opening question was answered (HTTP {st})", st == 200, json.dumps(d1)[:160])
        chk(f"run {n}: the opening answer is complete, not cut mid-sentence",
            bool(a1) and ends_at_sentence(a1), repr(a1[-80:]))
        chk(f"run {n}: it is grounded on the selected relationship",
            (d1.get("groundedResearch") or {}).get("title") == "Universal Transmissions IV — Tetra",
            str((d1.get("groundedResearch") or {}).get("title")))
        low1 = a1.lower()
        chk(f"run {n}: it addresses the tetrahedron question",
            "tetrahedr" in low1 or "tetra" in low1)

        print(f"=== run {n}: the follow-up, with the first turn as history ===")
        history = [{"role": "user", "content": OPENING}, {"role": "assistant", "content": a1}]
        st2, d2, el2 = ask(base, FOLLOW_UP, history)
        if not isinstance(d2, dict):
            d2 = {}
        a2 = d2.get("response") or ""
        chk(f"run {n}: the follow-up was answered (HTTP {st2})", st2 == 200, json.dumps(d2)[:160])
        chk(f"run {n}: the follow-up answer is complete, not cut mid-sentence",
            bool(a2) and ends_at_sentence(a2), repr(a2[-80:]))
        low2 = a2.lower()
        chk(f"run {n}: it distinguishes documentation from interpretation",
            any(w in low2 for w in ("documented", "documentation"))
            and any(w in low2 for w in ("interpretation", "reading", "the archive's own")),
            low2[:140])
        for name in UNSUPPLIED:
            chk(f"run {n}: it does not attribute {name} (never supplied)",
                name not in low2, " ".join(re.findall(rf".{{50}}{name}.{{50}}", low2))[:180])
        chk(f"run {n}: it cites no page number the grounding never supplied",
            not re.search(r"\bpage \d{2,4}\b", low2),
            str(re.findall(r".{30}page \d{2,4}.{30}", low2))[:180])
        # It must not claim to have read the destination record itself.
        chk(f"run {n}: it does not claim to have read the whole record",
            not re.search(r"\b(i have read|i read the (full|whole) (record|work)|the complete record)\b", low2),
            low2[:140])
        chk(f"run {n}: it stays inside the archive's voice (non-trivial prose)",
            len(a2) > 600)

        records.append({"run": n, "opening": {"http": st, "chars": len(a1), "elapsed": el1,
                                              "ends_at_sentence": ends_at_sentence(a1), "answer": a1},
                        "follow_up": {"http": st2, "chars": len(a2), "elapsed": el2,
                                      "ends_at_sentence": ends_at_sentence(a2), "answer": a2}})
        print()

    with open(out, "w", encoding="utf-8") as fh:
        json.dump({"base": base, "anchor": ANCHOR, "records": records}, fh, indent=2, ensure_ascii=False)
    cut = sum(1 for r in records for k in ("opening", "follow_up") if not r[k]["ends_at_sentence"])
    print(f"answers captured: {len(records) * 2}  |  ending mid-sentence: {cut}")
    print(f"assertions passed: {passed}\nassertions failed: {failed}")
    print("wrote", out)
    print("BATCH16B_ANSWER_COMPLETENESS_" + ("PASSED" if not failed else "FAILED"))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
