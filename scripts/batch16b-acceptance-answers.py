#!/usr/bin/env python3
"""batch16b-acceptance-answers.py — answer acceptance for the completed grounding.

Three questions, captured whole:

  Q1  the Tetra card's OWN suggested question, read out of the registry rather than
      retyped, so the acceptance uses exactly what the card opens with;
  Q2  a follow-up asking what is documented and what is the archive's own reading;
  Q3  a separate conversation asserting an UNSUPPORTED premise — that the series begins
      with the tetrahedron for a stated reason — where the Oracle should identify the
      missing evidence rather than agree.

The script captures and reports; it does not grade prose. Punctuation and keyword
checks are recorded as guards, and the answers are written out in full for reading.

Usage: python3 scripts/batch16b-acceptance-answers.py <base-url> [out.json]
"""
import json
import re
import subprocess
import sys
import urllib.error
import urllib.request

ANCHOR = "research-v1:geometry/connection/artwork-tetra"

Q2 = "Which parts of that are documented, and which parts are the archive's own reading?"
Q3 = ("The Universal Transmissions series starts with the tetrahedron because four faces "
      "are the minimum that can enclose a volume, and that is the documented reason the "
      "series begins with Tetra. Can you confirm that is why the series starts there?")

UNSUPPLIED = ["lawlor", "buckminster", "fuller", "blavatsky", "schwaller", "steiner"]


def card_question():
    """The Tetra card's own suggested question, straight from the registry."""
    js = (
        "const {registerTsModules}=require('./scripts/lib/ut-ts-require.cjs');"
        "registerTsModules({root:process.cwd()});"
        "const t=require('./src/lib/research-topics.ts');"
        "const c=t.allRegisteredConnections().find(r=>r.connection.anchorSlug==='artwork-tetra');"
        "process.stdout.write(c.connection.suggestedQuestion);"
    )
    return subprocess.run(["node", "-e", js], capture_output=True, text=True,
                          cwd="/root/ut-repo", check=True).stdout.strip()


def ask(base, message, history=None, anchor=ANCHOR):
    payload = {"message": message, "mode": "oracle", "lang": "en", "speed": "fast"}
    if anchor:
        payload["researchTopicId"] = anchor
    if history:
        payload["history"] = history
    req = urllib.request.Request(f"{base}/api/oracle", data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode()[:300]}


def ends_at_sentence(t):
    return bool(re.search(r"[.!?…\"'”’)\]]\s*$", (t or "").strip()))


def main():
    base = (sys.argv[1] if len(sys.argv) > 1 else "").rstrip("/")
    out = sys.argv[2] if len(sys.argv) > 2 else "/root/b16b/acceptance-answers.json"
    if not base:
        print("usage: batch16b-acceptance-answers.py <base-url> [out.json]")
        return 2

    q1 = card_question()
    print(f"base : {base}")
    print(f"Q1 is the Tetra card's own suggested question, read from the registry:\n  {q1}\n")

    record = {"base": base, "anchor": ANCHOR, "answers": []}

    print("=" * 100)
    print("Q1 (opening, as the card presents it)")
    print("=" * 100)
    st1, d1 = ask(base, q1)
    if not isinstance(d1, dict):
        d1 = {}
    a1 = d1.get("response") or ""
    print(f"http {st1} | {len(a1)} chars | ends_at_sentence={ends_at_sentence(a1)}")
    print(f"grounded on: {(d1.get('groundedResearch') or {}).get('title')}")
    print(f"answerTruncated: {d1.get('answerTruncated')}\n")
    print(a1, "\n")

    print("=" * 100)
    print("Q2 (follow-up, with Q1 as history)")
    print("=" * 100)
    st2, d2 = ask(base, Q2, history=[{"role": "user", "content": q1},
                                     {"role": "assistant", "content": a1}])
    if not isinstance(d2, dict):
        d2 = {}
    a2 = d2.get("response") or ""
    print(f"http {st2} | {len(a2)} chars | ends_at_sentence={ends_at_sentence(a2)}")
    print(f"grounded on: {(d2.get('groundedResearch') or {}).get('title')}")
    print(f"answerTruncated: {d2.get('answerTruncated')}\n")
    print(a2, "\n")

    print("=" * 100)
    print("Q3 (separate conversation: an unsupported premise the Oracle should not accept)")
    print("=" * 100)
    st3, d3 = ask(base, Q3)
    if not isinstance(d3, dict):
        d3 = {}
    a3 = d3.get("response") or ""
    print(f"http {st3} | {len(a3)} chars | ends_at_sentence={ends_at_sentence(a3)}")
    print(f"grounded on: {(d3.get('groundedResearch') or {}).get('title')}")
    print(f"answerTruncated: {d3.get('answerTruncated')}\n")
    print(a3, "\n")

    for label, st, a in (("Q1", st1, a1), ("Q2", st2, a2), ("Q3", st3, a3)):
        low = a.lower()
        record["answers"].append({
            "label": label, "http": st, "chars": len(a),
            "ends_at_sentence": ends_at_sentence(a), "answer": a,
            "guards": {
                "no_unsupplied_attribution": [n for n in UNSUPPLIED if n in low],
                "invented_page_numbers": re.findall(r"\bpage \d{2,4}\b", low),
                "claims_to_have_read": bool(re.search(
                    r"\b(i have read|i read the (full|whole) (record|work)|the complete record)\b", low)),
            },
        })

    record["questions"] = {"Q1_card_suggested": q1, "Q2": Q2, "Q3_unsupported_premise": Q3}
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(record, fh, indent=2, ensure_ascii=False)
    print("=" * 100)
    print("guards (recorded, NOT a quality verdict — the answers are read):")
    for r in record["answers"]:
        print(f"  {r['label']}: {r['chars']} chars, ends={r['ends_at_sentence']}, "
              f"unsupplied={r['guards']['no_unsupplied_attribution']}, "
              f"pages={r['guards']['invented_page_numbers']}, "
              f"claims_read={r['guards']['claims_to_have_read']}")
    print("\nwrote", out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
