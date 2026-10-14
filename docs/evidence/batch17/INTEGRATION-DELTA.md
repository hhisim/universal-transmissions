# Batch 17 integration source delta

Base: 40755e8cce2be9c04edfbe7a74794c11d0813ec2 (accepted Batch 16 candidate)
Tip:  a7e2f1001d2b6f00deb46eba0ca6fae26daeef07

## Integration source (site-side changes only)
```
 .../universal-resonator/ResonatorLoader.tsx        | 144 ++++++++++
 src/app/experience/universal-resonator/page.tsx    | 295 +++++++++++++++++++++
 src/lib/research-connections.ts                    |  22 ++
 3 files changed, 461 insertions(+)
```

## Full change list
```
A	docs/BATCH17-INSTRUMENT-ROOM.md
A	docs/evidence/batch17/live.json
A	public/experience/universal-resonator/THIRD_PARTY_NOTICES.txt
A	public/experience/universal-resonator/app.js
A	public/experience/universal-resonator/favicon.svg
A	public/experience/universal-resonator/fonts/cinzel-latin-400-normal.woff2
A	public/experience/universal-resonator/fonts/cinzel-latin-600-normal.woff2
A	public/experience/universal-resonator/fonts/cinzel-latin-700-normal.woff2
A	public/experience/universal-resonator/fonts/cinzel-latin-ext-400-normal.woff2
A	public/experience/universal-resonator/fonts/cinzel-latin-ext-600-normal.woff2
A	public/experience/universal-resonator/fonts/cormorant-garamond-latin-400-italic.woff2
A	public/experience/universal-resonator/fonts/cormorant-garamond-latin-400-normal.woff2
A	public/experience/universal-resonator/fonts/cormorant-garamond-latin-500-italic.woff2
A	public/experience/universal-resonator/fonts/cormorant-garamond-latin-500-normal.woff2
A	public/experience/universal-resonator/fonts/cormorant-garamond-latin-600-normal.woff2
A	public/experience/universal-resonator/fonts/cormorant-garamond-latin-ext-400-italic.woff2
A	public/experience/universal-resonator/fonts/cormorant-garamond-latin-ext-400-normal.woff2
A	public/experience/universal-resonator/fonts/space-mono-latin-400-normal.woff2
A	public/experience/universal-resonator/fonts/space-mono-latin-700-normal.woff2
A	public/experience/universal-resonator/fonts/space-mono-latin-ext-400-normal.woff2
A	public/experience/universal-resonator/index.html
A	public/experience/universal-resonator/style.css
A	public/experience/universal-resonator/ut-logo.svg
A	public/experience/universal-resonator/worker.js
M	scripts/batch15-research-topology.js
M	scripts/batch16-research-nexus.js
A	scripts/batch17-instrument-room.js
A	scripts/batch17-live-verification.py
A	src/app/experience/universal-resonator/ResonatorLoader.tsx
A	src/app/experience/universal-resonator/page.tsx
M	src/lib/research-connections.ts
```

## Integration source diff
```diff
diff --git a/src/app/experience/universal-resonator/ResonatorLoader.tsx b/src/app/experience/universal-resonator/ResonatorLoader.tsx
new file mode 100644
index 0000000..457af33
--- /dev/null
+++ b/src/app/experience/universal-resonator/ResonatorLoader.tsx
@@ -0,0 +1,144 @@
+'use client';
+
+import { useState } from 'react';
+
+/**
+ * The Universal Resonator, mounted only after an explicit launch.
+ *
+ * The instrument is a 960 KB WebGL/Web Audio bundle that spins up a worker, a GL
+ * context and an audio graph. None of that may happen on a reading page, so before
+ * launch this component renders a panel and NOTHING else: no iframe, no script tag, no
+ * preload. The bundle is requested for the first time when the visitor chooses to
+ * enter, and unmounting the frame is how they leave it again.
+ *
+ * The microphone is behind the instrument's own control. It is declared in `allow`
+ * so the panel can ask for it if the visitor turns it on, and is never requested by
+ * this page.
+ */
+export default function ResonatorLoader() {
+  const [launched, setLaunched] = useState(false);
+  const [ready, setReady] = useState(false);
+
+  function leave() {
+    // Unmounting the frame tears down the GL context, the worker and the audio graph.
+    setLaunched(false);
+    setReady(false);
+  }
+
+  if (!launched) {
+    return (
+      <div
+        data-resonator-launch-panel="true"
+        className="ut-card p-8 md:p-10"
+        style={{ background: 'rgba(147, 51, 234, 0.03)' }}
+      >
+        <p
+          className="font-mono text-[9px] tracking-[0.25em] uppercase mb-3"
+          style={{ color: 'var(--ut-gold)', opacity: 0.85 }}
+        >
+          Instrument · requires a graphics card
+        </p>
+        <h2
+          className="font-display text-xl md:text-2xl mb-3"
+          style={{ color: 'var(--ut-white)' }}
+        >
+          Launch the Universal Resonator
+        </h2>
+        <p
+          className="font-body text-sm leading-relaxed mb-5 max-w-2xl"
+          style={{ color: 'var(--ut-white-dim)', opacity: 0.75 }}
+        >
+          Nothing has been started yet — this page is still a reading page. Launching loads
+          the instrument: a WebGL plate, a solver worker and a Web Audio graph. The
+          microphone is off unless you switch it on inside, and it is never requested from
+          here.
+        </p>
+        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
+          <button
+            type="button"
+            data-resonator-launch="true"
+            onClick={() => setLaunched(true)}
+            className="font-mono text-[10px] tracking-[0.25em] uppercase px-6 py-3 border transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
+            style={{
+              borderColor: 'var(--ut-purple)',
+              color: 'var(--ut-purple)',
+              background: 'rgba(147, 51, 234, 0.06)',
+            }}
+          >
+            Awaken the field →
+          </button>
+          <span
+            className="font-mono text-[10px] tracking-[0.15em] uppercase"
+            style={{ color: 'var(--ut-white-faint)', opacity: 0.6 }}
+          >
+            ≈ 1 MB · keyboard and touch controls inside
+          </span>
+        </div>
+      </div>
+    );
+  }
+
+  return (
+    <div data-resonator-stage="true">
+      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
+        <span
+          className="font-mono text-[10px] tracking-[0.25em] uppercase"
+          style={{ color: 'var(--ut-gold)', opacity: 0.85 }}
+        >
+          The instrument is open
+        </span>
+        <button
+          type="button"
+          data-resonator-stop="true"
+          onClick={leave}
+          className="font-mono text-[9px] tracking-[0.2em] uppercase px-4 py-2 border transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
+          style={{ borderColor: 'var(--ut-border)', color: 'var(--ut-white-faint)' }}
+        >
+          Leave the instrument · stop audio and graphics
+        </button>
+      </div>
+      <div
+        className="w-full relative"
+        style={{ height: 'calc(100vh - 200px)', minHeight: 640, background: '#050409' }}
+      >
+        {!ready && (
+          <div
+            className="absolute inset-0 flex items-center justify-center"
+            style={{ background: '#050409', zIndex: 1 }}
+          >
+            <div className="text-center">
+              <div className="font-display text-3xl mb-3" style={{ color: 'var(--ut-purple)' }}>
+                ◈
+              </div>
+              <div
+                className="font-mono text-[10px] tracking-[0.25em] uppercase"
+                style={{ color: 'var(--ut-purple)' }}
+              >
+                Awakening the field
+              </div>
+            </div>
+          </div>
+        )}
+        <iframe
+          data-resonator-frame="true"
+          src="/experience/universal-resonator/index.html"
+          title="The Universal Resonator"
+          className="w-full h-full block"
+          style={{
+            border: 'none',
+            background: '#050409',
+            opacity: ready ? 1 : 0,
+            transition: 'opacity 0.4s',
+          }}
+          allow="microphone; autoplay; fullscreen"
+          /* allow-downloads is REQUIRED: the instrument's Snapshot and Record both save
+             their file by synthesising an <a download> click. Without it a sandboxed
+             frame silently produces the file and then throws it away — the instrument
+             toasts "Snapshot saved." and the visitor gets nothing at all. */
+          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-downloads"
+          onLoad={() => setReady(true)}
+        />
+      </div>
+    </div>
+  );
+}
diff --git a/src/app/experience/universal-resonator/page.tsx b/src/app/experience/universal-resonator/page.tsx
new file mode 100644
index 0000000..b00605e
--- /dev/null
+++ b/src/app/experience/universal-resonator/page.tsx
@@ -0,0 +1,295 @@
+import Link from "next/link";
+import SectionReveal from "@/components/ui/SectionReveal";
+import ResonatorLoader from "./ResonatorLoader";
+import { allRegisteredConnections, resolveResearchTopic } from "@/lib/research-topics";
+import { BASIS_STYLE } from "@/components/research/basis-style";
+
+const ANCHOR_SLUG = "instrument-universal-resonator";
+
+/**
+ * The instrument room.
+ *
+ * A reading page first. The instrument bundle is 960 KB of WebGL and audio and is NOT
+ * referenced here at all - it is requested for the first time when the visitor launches
+ * it, from ResonatorLoader. Everything on this page before that point is text, links
+ * and the room's own registry data.
+ */
+export default function UniversalResonatorPage() {
+  const entry = allRegisteredConnections().find(
+    (r) => r.topicSlug === "cymatics" && r.connection.anchorSlug === ANCHOR_SLUG
+  );
+  const connection = entry?.connection;
+  const anchorId = entry?.anchorId ?? `research-v1:cymatics/connection/${ANCHOR_SLUG}`;
+  const topic = resolveResearchTopic(anchorId);
+  const references = (topic?.sources ?? []).filter((s) => !s.internal);
+
+  const oracleHref =
+    `/oracle?view=desktop&researchTopicId=${encodeURIComponent(anchorId)}` +
+    `&from=${encodeURIComponent("/experience/universal-resonator")}` +
+    (connection ? `&q=${encodeURIComponent(connection.suggestedQuestion)}` : "");
+
+  return (
+    <div data-instrument-room="true">
+      {/* ── the room, and the launch ─────────────────────────────────────────── */}
+      <section className="py-16 relative overflow-hidden">
+        <div
+          className="absolute inset-0 pointer-events-none"
+          style={{
+            background:
+              "radial-gradient(ellipse at 50% 0%, rgba(147, 51, 234, 0.10) 0%, transparent 60%)",
+          }}
+        />
+        <div className="container-ut relative">
+          <SectionReveal>
+            <p
+              className="font-mono text-[9px] tracking-[0.5em] uppercase mb-4"
+              style={{ color: "var(--ut-cyan)", opacity: 0.5 }}
+            >
+              [ Research — Cymatics · Instrument ]
+            </p>
+          </SectionReveal>
+
+          <SectionReveal delay={0.1}>
+            <h1
+              className="font-display text-4xl md:text-6xl mb-5"
+              style={{ color: "var(--ut-white)" }}
+            >
+              The Universal Resonator
+            </h1>
+          </SectionReveal>
+
+          <SectionReveal delay={0.15}>
+            <p
+              className="font-body text-base md:text-lg leading-relaxed max-w-3xl mb-8"
+              style={{ color: "var(--ut-white-dim)", opacity: 0.8 }}
+            >
+              The instrument of this room. Everywhere else in Cymatics the archive writes
+              about a driven plate and what forms on it; here you drive one yourself —
+              choose the mode, the frequency and the medium, and watch the nodal structure
+              gather the sand. Keep reading first if you prefer: nothing below runs until
+              you start it.
+            </p>
+          </SectionReveal>
+
+          <SectionReveal delay={0.2}>
+            <ResonatorLoader />
+          </SectionReveal>
+
+          <SectionReveal delay={0.25}>
+            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-6">
+              <Link
+                href="/research/cymatics"
+                data-instrument-return="true"
+                className="font-mono text-[10px] tracking-[0.2em] uppercase focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
+                style={{ color: "var(--ut-cyan)" }}
+              >
+                ← Back to the Cymatics room
+              </Link>
+              <Link
+                href="/research"
+                className="font-mono text-[10px] tracking-[0.2em] uppercase focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
+                style={{ color: "var(--ut-white-faint)" }}
+              >
+                The research nexus
+              </Link>
+            </div>
+          </SectionReveal>
+        </div>
+      </section>
+
+      {/* ── what the model actually is ──────────────────────────────────────── */}
+      <section className="py-14" data-instrument-model="true" style={{ borderTop: "1px solid var(--ut-border)" }}>
+        <div className="container-ut">
+          <SectionReveal>
+            <h2
+              className="font-display text-2xl md:text-3xl mb-4"
+              style={{ color: "var(--ut-white)" }}
+            >
+              What the instrument is actually solving
+            </h2>
+          </SectionReveal>
+          <SectionReveal delay={0.1}>
+            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl">
+              <div className="ut-card p-6" style={{ background: "rgba(34, 211, 238, 0.03)" }}>
+                <p
+                  className="font-mono text-[9px] tracking-[0.25em] uppercase mb-2"
+                  style={{ color: "var(--ut-cyan)" }}
+                >
+                  The model
+                </p>
+                <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.8 }}>
+                  A generating cosine plate or a Bessel membrane, evaluated live from the
+                  current mode numbers, phase, interference and harmonic partials. The sand
+                  is solved against that field: grains migrate off the moving antinodes and
+                  settle into the nodal lines, which is the same thing a real plate does to
+                  powder — here done in a model rather than on metal. A worker thread
+                  computes 8,000 monitor grains and a field-distance contour from the same
+                  model packet the main solve uses, so the 2D monitor is a diagnostic of the
+                  live model and not a decorative thumbnail.
+                </p>
+              </div>
+              <div className="ut-card p-6" style={{ background: "rgba(212, 168, 71, 0.03)" }}>
+                <p
+                  className="font-mono text-[9px] tracking-[0.25em] uppercase mb-2"
+                  style={{ color: "var(--ut-gold)" }}
+                >
+                  Where the model stops
+                </p>
+                <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.8 }}>
+                  It is an idealised model. The plate is homogeneous and perfectly
+                  constrained, so the pattern it produces is not a prediction for any
+                  particular sheet of metal, glass or drum skin you could hold — real plates
+                  have thickness, damping, mounting and material of their own. What the
+                  instrument shows is the structure of the model&rsquo;s own mathematics made
+                  visible, and that is a genuinely useful thing to see. It is not a
+                  measurement, and the archive does not present it as one.
+                </p>
+              </div>
+            </div>
+          </SectionReveal>
+        </div>
+      </section>
+
+      {/* ── what this rests on ─────────────────────────────────────────────── */}
+      <section className="py-14" data-instrument-references="true" style={{ borderTop: "1px solid var(--ut-border)" }}>
+        <div className="container-ut">
+          <SectionReveal>
+            <h2
+              className="font-display text-2xl md:text-3xl mb-3"
+              style={{ color: "var(--ut-white)" }}
+            >
+              What this room rests on
+            </h2>
+            <p
+              className="font-body text-sm leading-relaxed mb-6 max-w-3xl"
+              style={{ color: "var(--ut-white-dim)", opacity: 0.72 }}
+            >
+              These are the Cymatics room&rsquo;s own references, carried here rather than
+              copied, each with what it is offered as support for. They scope the subject;
+              they are not a claim that the archive has read them on your behalf.
+            </p>
+          </SectionReveal>
+          <SectionReveal delay={0.1}>
+            <ul className="space-y-3 max-w-4xl">
+              {references.map((s) => (
+                <li key={s.url} className="ut-card p-5">
+                  <a
+                    href={s.url}
+                    target="_blank"
+                    rel="noopener noreferrer"
+                    className="font-body text-sm focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
+                    style={{ color: "var(--ut-gold)" }}
+                  >
+                    {s.label}
+                  </a>
+                  <p
+                    className="font-body text-[13px] leading-relaxed mt-2"
+                    style={{ color: "var(--ut-white-faint)", opacity: 0.75 }}
+                  >
+                    {s.supports}
+                  </p>
+                </li>
+              ))}
+            </ul>
+          </SectionReveal>
+
+          {connection ? (
+            <SectionReveal delay={0.15}>
+              <div className="ut-card p-6 mt-6 max-w-4xl" data-instrument-connection="true">
+                <span
+                  className="inline-block font-mono text-[9px] tracking-[0.25em] uppercase px-2 py-1 mb-3 border"
+                  style={{
+                    borderColor: BASIS_STYLE[connection.basis].color,
+                    color: BASIS_STYLE[connection.basis].color,
+                  }}
+                >
+                  {BASIS_STYLE[connection.basis].label}
+                </span>
+                <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.8 }}>
+                  {connection.rationale}
+                </p>
+                {/* A destination that cannot simply be followed to the thing it names is
+                    described rather than implied. */}
+                <p
+                  className="font-mono text-[10px] leading-relaxed mt-4"
+                  style={{ color: "var(--ut-white-faint)", opacity: 0.7 }}
+                >
+                  Finding your way there: {connection.destinationNote}
+                </p>
+              </div>
+            </SectionReveal>
+          ) : null}
+        </div>
+      </section>
+
+      {/* ── the Oracle, in this context ────────────────────────────────────── */}
+      <section className="py-14" style={{ borderTop: "1px solid var(--ut-border)" }}>
+        <div className="container-ut">
+          <SectionReveal>
+            <h2
+              className="font-display text-2xl md:text-3xl mb-3"
+              style={{ color: "var(--ut-white)" }}
+            >
+              Ask about the instrument
+            </h2>
+            <p
+              className="font-body text-sm leading-relaxed mb-6 max-w-3xl"
+              style={{ color: "var(--ut-white-dim)", opacity: 0.72 }}
+            >
+              The Oracle opens with this instrument as its subject — the room&rsquo;s facts,
+              the model, and what each reference is offered for — so a question about the
+              resonator is answered in the resonator&rsquo;s own terms rather than in
+              generalities.
+            </p>
+          </SectionReveal>
+          <SectionReveal delay={0.1}>
+            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
+              <Link
+                href={oracleHref}
+                data-instrument-oracle="true"
+                className="font-mono text-[10px] tracking-[0.2em] uppercase px-5 py-3 border transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
+                style={{
+                  borderColor: "var(--ut-purple)",
+                  color: "var(--ut-purple)",
+                  background: "rgba(147, 51, 234, 0.05)",
+                }}
+              >
+                Open the Oracle in this context →
+              </Link>
+              {connection ? (
+                <p
+                  className="font-body text-[13px] italic max-w-xl"
+                  style={{ color: "var(--ut-white-faint)", opacity: 0.7 }}
+                >
+                  It opens with: &ldquo;{connection.suggestedQuestion}&rdquo;
+                </p>
+              ) : null}
+            </div>
+          </SectionReveal>
+        </div>
+      </section>
+
+      {/* ── third-party notices ────────────────────────────────────────────── */}
+      <section className="py-10" style={{ borderTop: "1px solid var(--ut-border)" }}>
+        <div className="container-ut">
+          <p
+            className="font-mono text-[10px] leading-relaxed"
+            style={{ color: "var(--ut-white-faint)", opacity: 0.55 }}
+          >
+            The instrument bundles Three.js and is built with esbuild. Their notices travel
+            with it at{" "}
+            <a
+              href="/experience/universal-resonator/THIRD_PARTY_NOTICES.txt"
+              target="_blank"
+              rel="noopener noreferrer"
+              style={{ color: "var(--ut-cyan)" }}
+            >
+              THIRD_PARTY_NOTICES.txt
+            </a>
+            .
+          </p>
+        </div>
+      </section>
+    </div>
+  );
+}
diff --git a/src/lib/research-connections.ts b/src/lib/research-connections.ts
index d7331de..73da816 100644
--- a/src/lib/research-connections.ts
+++ b/src/lib/research-connections.ts
@@ -40,6 +40,9 @@ export interface ResearchConnection {
 /**
  * Cymatics connections, curated from records that already exist in this repo.
  * Every href below is a real route and every title is the record's own title.
+ *
+ * The Instrument entry was appended last so the six connections released with the
+ * Cymatics room keep their original anchors and their order.
  */
 export const CYMATICS_CONNECTIONS: ResearchConnection[] = [
   {
@@ -120,6 +123,25 @@ export const CYMATICS_CONNECTIONS: ResearchConnection[] = [
     suggestedQuestion:
       "Vibration as a Hermetic principle is lineage context rather than a scientific source - how should that be held alongside the experiment?",
   },
+  /* ── The instrument room (batch 17) ─────────────────────────────────────────
+     Appended last so the six connections above keep the anchors and the order they
+     were released with. The instrument is the one record in this room that PERFORMS
+     the room's subject rather than writing about it, which is why it belongs here
+     rather than in a separate list. */
+  {
+    anchorSlug: "instrument-universal-resonator",
+    href: "/experience/universal-resonator",
+    kind: "Instrument",
+    title: "The Universal Resonator",
+    rationale:
+      "The archive's own instrument for this room: it solves a driven plate or membrane field and renders the nodal structure as tethered sand, with a live 2D model monitor. It belongs because it is the only record here that performs the room's subject instead of describing it - the visitor drives a medium and reads the pattern that forms. Its own record is explicit about the limit, and that limit travels with this connection rather than staying on the instrument page: the plate is an idealised model, so what it shows is the structure of the model's own mathematics made visible. It is not a physical measurement of a real plate, it is not a prediction for any particular sheet of material you could hold, and the monitor is a model diagnostic rather than a decorative thumbnail. Idealised is not the same as false - the model is real and it is solved honestly - but nothing here should be read as an experimental result.",
+    basis: "documented",
+    basisLabel: "A UT instrument, with its model stated in its own record",
+    destinationNote:
+      "The room opens as a reading page. The instrument itself does not load until you launch it, and leaving stops its audio and graphics.",
+    suggestedQuestion:
+      "The instrument solves a model rather than measuring a real plate - what exactly is it solving, and where does that model stop being able to tell you about a physical plate?",
+  },
 ];
 
 /**
```
