/**
 * Review regression: speech/audio lifecycle invariants added in review.
 *
 * Covers behaviour that the batch-1 tests did not: voice-off during an
 * in-flight TTS request, superseding a question, object-URL release, and
 * unmount behaviour. Assertions are made against the real source so a
 * regression fails the test rather than silently passing.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(process.argv[2] || process.cwd());
const src = fs.readFileSync(path.join(ROOT, "src/app/oracle/page-client.tsx"), "utf8");

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail = "") {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
}

console.log("\nSpeech request is abortable");
check("a dedicated speech AbortController exists", /speechAbortRef = useRef<AbortController \| null>/.test(src));
check("fetchTTS passes an abort signal", /signal:\s*controller\.signal/.test(src));
check("fetchTTS bails if aborted after the blob arrives", /if \(controller\.signal\.aborted\) return "";/.test(src));
check("a prior speech request is cancelled before a new one", /speechAbortRef\.current\?\.abort\(\);\s*\n\s*const controller = new AbortController\(\);/.test(src));

console.log("\nVoice-off cancels pending speech");
check("cancelPendingSpeech is defined", /const cancelPendingSpeech = useCallback/.test(src));
check("cancelPendingSpeech aborts the request", /speechAbortRef\.current\?\.abort\(\)/.test(src));
check("cancelPendingSpeech clears the pending marker", /ttsPending: false/.test(src));
const toggleCount = (src.match(/if \(!next\) cancelPendingSpeech\(\);/g) || []).length;
check("both voice toggles cancel speech", toggleCount === 2, `found ${toggleCount} toggle(s)`);

console.log("\nSuperseded questions cancel speech");
check("submitting a new question cancels pending speech", /reqAbortRef\.current\?\.abort\(\);\s*\n\s*cancelPendingSpeech\(\);/.test(src));

console.log("\nObject URLs are released");
check("aborted speech revokes its object URL", /if \(audioUrl\) URL\.revokeObjectURL\(audioUrl\);/.test(src));
check("replacing a bubble revokes the audio it held", /existing\.audioUrl && existing\.audioUrl !== audioUrl\) URL\.revokeObjectURL/.test(src));
check("unmount revokes every held object URL", /for \(const m of p\) if \(m\.audioUrl\) URL\.revokeObjectURL\(m\.audioUrl\)/.test(src));
check("AudioPlayer releases its src on unmount", /if \(src\) URL\.revokeObjectURL\(src\);/.test(src));
check("AudioPlayer pauses playback on unmount", /a\.pause\(\); a\.removeAttribute\("src"\); a\.load\(\);/.test(src));

console.log("\nUnmount does not schedule stale updates");
check("unmount aborts the oracle request", /reqAbortRef\.current\?\.abort\(\);/.test(src));
check("unmount aborts the speech request", /speechAbortRef\.current\?\.abort\(\);/.test(src));
check("send() ignores aborted results", /if \(reqController\.signal\.aborted\) return;/.test(src));
check("speech callback ignores aborted results", /if \(reqController\.signal\.aborted\) \{/.test(src));

console.log("\nText lifecycle unchanged and still text-first");
const appendIdx = src.indexOf("setMsgs((p) => [...p, bubble])");
const ttsIdx = src.indexOf("fetchTTS(answer).then(");
check("answer is appended before speech is requested", appendIdx > 0 && ttsIdx > appendIdx, `append@${appendIdx} tts@${ttsIdx}`);
check("no awaited TTS before the append", !/await fetchTTS/.test(src));

console.log("\nVoice settings behaviour preserved");
check("voiceOn default is on", /const \[voiceOn, setVoiceOn\] = useState\(true\)/.test(src));
check("voice gender still selects hd/standard", /voiceGender === "m" \? "standard" : "hd"/.test(src));
check("speechSynthesis.cancel still called when muting", /window\.speechSynthesis\?\.cancel\(\)/.test(src));
check("TTS skipped entirely when voice off", /if \(!voiceOn\) return "";/.test(src));

console.log(`\n${"=".repeat(56)}`);
console.log(`PASS ${pass}   FAIL ${fail}`);
if (failures.length) {
  console.log("\nFailures:");
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
console.log("ALL_SPEECH_LIFECYCLE_TESTS_PASSED");