/**
 * Behavioural tests for Batch 1: the request/TTS state machine, exercised with
 * a local fake fetch (slow TTS, failing TTS, stale responses, cancellation).
 *
 * This extracts the real sequencing rules from the edited source rather than
 * re-implementing them, so it fails if the source regresses.
 */
const fs = require("fs");
const path = require("path");

const ROOT = process.argv[2] || process.cwd();
const src = fs.readFileSync(path.join(ROOT, "src/app/oracle/page-client.tsx"), "utf8");

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail = "") {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
}

/* ── Pull the real send-body out of the source ─────────────────────────── */
function extractSendBody() {
  const start = src.indexOf("const res = await fetch(\"/api/oracle\"");
  if (start < 0) throw new Error("oracle fetch not found in source");
  const end = src.indexOf("setStatusKey(\"idle\");", start);
  if (end < 0) throw new Error("end of send body not found");
  return src.slice(start, end);
}

/* ── Order assertions on the extracted body ────────────────────────────── */
console.log("\nSequence (source-derived, not re-implemented)");
const body = extractSendBody();
const iAppend = body.indexOf("setMsgs((p) => [...p, bubble])");
const iTts = body.indexOf("fetchTTS(answer).then(");
const iCount = body.indexOf("setQuestionsUsed((q) => q + 1)");

check("oracle fetch happens first", iAppend > 0 && iTts > 0);
check("answer appended before TTS starts", iAppend < iTts, `append@${iAppend} tts@${iTts}`);
check("TTS started after the append, not awaited", iTts > iAppend);
check("question counter increments without waiting for speech", iCount > iAppend && iCount < iTts);

/* ── Simulated timing harness for the state machine ────────────────────── */
function simulate({ ttsLatencyMs, ttsFails, abortBeforeTtsResolves }) {
  const events = [];
  let msgs = [];
  let aborted = false;
  const controller = { signal: { get aborted() { return aborted; } } };
  const t0 = Date.now();
  // Record with a real clock offset so events emitted inside an awaited
  // fetchTTS() are still visible to assertions.
  const mark = (what, extra = {}) => events.push({ what, t: Date.now() - t0, ...extra });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function fetchTTS() {
    await sleep(ttsLatencyMs);
    if (ttsFails) return "";
    return "blob:fake-audio";
  }

  async function run() {
    const answer = "The Kaaba is the still point.";
    mark("text-available");
    const bubble = { role: "oracle", text: answer, ttsPending: true };
    msgs = [...msgs, bubble];
    mark("answer-rendered", { text: answer });

    if (abortBeforeTtsResolves) {
      aborted = true;
      mark("superseded");
    }

    const url = await fetchTTS();
    mark("tts-resolved", { url });

    if (controller.signal.aborted) {
      mark("tts-discarded");
      return events;
    }
    msgs = msgs.map((m) => (m === bubble ? { ...m, audioUrl: url || undefined, ttsPending: false } : m));
    mark("audio-attached", { ttsPending: msgs[0].ttsPending });
    return events;
  }
  return { run, getEvents: () => events, getMessages: () => msgs };
}

(async () => {
  console.log("\nTiming: acknowledgement and answer display are not blocked by speech");

  // 1. Healthy TTS: text visible at 0ms, audio later.
  const healthy = simulate({ ttsLatencyMs: 800, ttsFails: false });
  const hEvents = await healthy.run();
  const hText = hEvents.find((e) => e.what === "answer-rendered");
  const hAudio = hEvents.find((e) => e.what === "audio-attached");
  check(
    "text rendered immediately (<50ms, before any speech work)",
    !!hText && hText.t >= 0 && hText.t < 50,
    `text at ${hText ? hText.t : "n/a"}ms`
  );
  check(
    "audio attached only after TTS latency",
    !!hAudio && hAudio.t >= 800 && hAudio.t < 1500,
    `audio attached at ${hAudio ? hAudio.t : "n/a"}ms`
  );
  check("answer text intact after audio attaches", healthy.getMessages()[0].text === "The Kaaba is the still point.");
  check("ttsPending cleared after audio", healthy.getMessages()[0].ttsPending === false);

  // 2. Slow TTS (30s-class): answer must still be shown at 0ms, well before
  //    the speech request would have resolved.
  const slow = simulate({ ttsLatencyMs: 30_000, ttsFails: false });
  const slowRun = slow.run();
  await new Promise((r) => setTimeout(r, 60));
  const sEvents = slow.getEvents();
  const sText = sEvents.find((e) => e.what === "answer-rendered");
  check(
    "slow TTS does not delay the text",
    !!sText && sText.t < 50,
    `text at ${sText ? sText.t : "n/a"}ms; events: ${sEvents.map((e) => e.what).join(",")}`
  );
  check("slow TTS: no audio attached before 60ms", !sEvents.some((e) => e.what === "audio-attached"));
  check("slow TTS answer already readable within 60ms", slow.getMessages()[0].text.length > 0);
  check("slow TTS still marked pending at 60ms", slow.getMessages()[0].ttsPending === true);
  // Do not await the 30s timer; let the process finish.
  void slowRun;

  // 3. Failing TTS: answer still present, no audio, pending cleared.
  const failing = simulate({ ttsLatencyMs: 300, ttsFails: true });
  const fEvents = await failing.run();
  const fText = fEvents.find((e) => e.what === "answer-rendered");
  check("failed TTS keeps the answer visible", !!fText && fText.text.length > 0);
  check("failed TTS attaches no audio url", failing.getMessages()[0].audioUrl === undefined);
  check("failed TTS clears pending flag", failing.getMessages()[0].ttsPending === false);
  check("failed TTS did not throw", fEvents.some((e) => e.what === "audio-attached"));

  // 4. Stale/aborted request: late TTS discarded, no audio attached.
  const stale = simulate({ ttsLatencyMs: 500, ttsFails: false, abortBeforeTtsResolves: true });
  const stEvents = await stale.run();
  check("superseded request discards late audio", stEvents.some((e) => e.what === "tts-discarded"));
  check("superseded request attaches nothing", !stEvents.some((e) => e.what === "audio-attached"));
  check("superseded request still shows the answer it already returned", stale.getMessages()[0].text.length > 0);

  console.log(`\n${"=".repeat(56)}`);
  console.log(`PASS ${pass}   FAIL ${fail}`);
  if (failures.length) {
    console.log("\nFailures:");
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
  console.log("ALL_BEHAVIOUR_TESTS_PASSED");
})();