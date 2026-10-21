'use client';

import { useState } from 'react';

/**
 * The Universal Resonator, mounted only after an explicit launch.
 *
 * The instrument is a 960 KB WebGL/Web Audio bundle that spins up a worker, a GL
 * context and an audio graph. None of that may happen on a reading page, so before
 * launch this component renders a panel and NOTHING else: no iframe, no script tag, no
 * preload. The bundle is requested for the first time when the visitor chooses to
 * enter, and unmounting the frame is how they leave it again.
 *
 * The microphone is behind the instrument's own control. It is declared in `allow`
 * so the panel can ask for it if the visitor turns it on, and is never requested by
 * this page.
 */
export default function ResonatorLoader() {
  const [launched, setLaunched] = useState(false);
  const [ready, setReady] = useState(false);

  function leave() {
    // Unmounting the frame tears down the GL context, the worker and the audio graph.
    setLaunched(false);
    setReady(false);
  }

  if (!launched) {
    return (
      <div
        data-resonator-launch-panel="true"
        className="ut-experience ut-experience-launch ut-card p-8 md:p-10"
        style={{ background: 'rgba(147, 51, 234, 0.03)' }}
      >
        <p
          className="font-mono text-[9px] tracking-[0.25em] uppercase mb-3"
          style={{ color: 'var(--ut-gold)', opacity: 0.85 }}
        >
          Instrument · requires a graphics card
        </p>
        <h2
          className="font-display text-xl md:text-2xl mb-3"
          style={{ color: 'var(--ut-white)' }}
        >
          Launch the Universal Resonator
        </h2>
        <p
          className="font-body text-sm leading-relaxed mb-5 max-w-2xl"
          style={{ color: 'var(--ut-white-dim)', opacity: 0.75 }}
        >
          Nothing has been started yet — this page is still a reading page. Launching loads
          the instrument: a WebGL plate, a solver worker and a Web Audio graph. The
          microphone is off unless you switch it on inside, and it is never requested from
          here.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <button
            type="button"
            data-resonator-launch="true"
            onClick={() => setLaunched(true)}
            className="font-mono text-[10px] tracking-[0.25em] uppercase px-6 py-3 border transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
            style={{
              borderColor: 'var(--ut-purple)',
              color: 'var(--ut-purple)',
              background: 'rgba(147, 51, 234, 0.06)',
            }}
          >
            Awaken the field →
          </button>
          <span
            className="font-mono text-[10px] tracking-[0.15em] uppercase"
            style={{ color: 'var(--ut-white-faint)', opacity: 0.6 }}
          >
            ≈ 1 MB · keyboard and touch controls inside
          </span>
        </div>
      </div>
    );
  }

  return (
    <div data-resonator-stage="true" className="ut-experience ut-experience-stage">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <span
          className="font-mono text-[10px] tracking-[0.25em] uppercase"
          style={{ color: 'var(--ut-gold)', opacity: 0.85 }}
        >
          The instrument is open
        </span>
        <button
          type="button"
          data-resonator-stop="true"
          onClick={leave}
          className="font-mono text-[9px] tracking-[0.2em] uppercase px-4 py-2 border transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
          style={{ borderColor: 'var(--ut-border)', color: 'var(--ut-white-faint)' }}
        >
          Leave the instrument · stop audio and graphics
        </button>
      </div>
      <div
        className="w-full relative"
        style={{ height: 'calc(100vh - 200px)', minHeight: 640, background: '#050409' }}
      >
        {!ready && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: '#050409', zIndex: 1 }}
          >
            <div className="text-center">
              <div className="font-display text-3xl mb-3" style={{ color: 'var(--ut-purple)' }}>
                ◈
              </div>
              <div
                className="font-mono text-[10px] tracking-[0.25em] uppercase"
                style={{ color: 'var(--ut-purple)' }}
              >
                Awakening the field
              </div>
            </div>
          </div>
        )}
        <iframe
          data-resonator-frame="true"
          src="/experience/universal-resonator/index.html"
          title="The Universal Resonator"
          className="w-full h-full block"
          style={{
            border: 'none',
            background: '#050409',
            opacity: ready ? 1 : 0,
            transition: 'opacity 0.4s',
          }}
          allow="microphone; autoplay; fullscreen"
          /* allow-downloads is REQUIRED: the instrument's Snapshot and Record both save
             their file by synthesising an <a download> click. Without it a sandboxed
             frame silently produces the file and then throws it away — the instrument
             toasts "Snapshot saved." and the visitor gets nothing at all. */
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-downloads"
          onLoad={() => setReady(true)}
        />
      </div>
    </div>
  );
}
