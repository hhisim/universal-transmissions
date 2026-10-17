'use client';

import { useState } from 'react';

/**
 * A framed instrument, mounted only after an explicit launch.
 *
 * Until the visitor chooses to enter, this renders a reading panel and NOTHING
 * else: no iframe, no script tag, no preload, no worker, no audio context. The
 * frame's own payload is requested for the first time on launch, and leaving
 * unmounts it — which is what tears the instrument down again.
 *
 * The `allow` list is passed through because the instruments may ask for a
 * microphone or autoplay once they are running; this page never asks for either.
 */
export default function InstrumentFrame({
  src,
  title,
  kicker,
  launchTitle,
  launchCopy,
  launchCta,
  sizeNote,
  accent,
  heightCalc = 'calc(100vh - 240px)',
  minHeight = 720,
  background = '#02020a',
  dataPrefix,
}: {
  src: string;
  title: string;
  kicker: string;
  launchTitle: string;
  launchCopy: string;
  launchCta: string;
  sizeNote: string;
  accent: string;
  heightCalc?: string;
  minHeight?: number;
  background?: string;
  dataPrefix: string;
}) {
  const [launched, setLaunched] = useState(false);
  const [ready, setReady] = useState(false);

  if (!launched) {
    return (
      <div
        data-instrument-launch="true"
        className="ut-card p-8 md:p-10"
        style={{ background: 'rgba(10, 9, 16, 0.72)' }}
      >
        <p
          className="font-mono text-[9px] tracking-[0.25em] uppercase mb-3"
          style={{ color: accent, opacity: 0.85 }}
        >
          {kicker}
        </p>
        <h2 className="font-display text-xl md:text-2xl mb-3" style={{ color: 'var(--ut-white)' }}>
          {launchTitle}
        </h2>
        <p
          className="font-body text-sm leading-relaxed mb-5 max-w-2xl"
          style={{ color: 'var(--ut-white-dim)', opacity: 0.78 }}
        >
          {launchCopy}
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <button
            type="button"
            data-instrument-start="true"
            onClick={() => setLaunched(true)}
            className="font-mono text-[10px] tracking-[0.25em] uppercase px-6 py-3 border transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
            style={{ borderColor: accent, color: accent, background: 'rgba(255,255,255,0.03)' }}
          >
            {launchCta}
          </button>
          <span
            className="font-mono text-[10px] tracking-[0.15em] uppercase"
            style={{ color: 'var(--ut-white-faint)', opacity: 0.6 }}
          >
            {sizeNote}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div data-instrument-stage="true">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <span
          className="font-mono text-[10px] tracking-[0.25em] uppercase"
          style={{ color: accent, opacity: 0.85 }}
        >
          The room is open
        </span>
        <button
          type="button"
          data-instrument-stop="true"
          onClick={() => {
            // Unmounting the frame is the teardown: its scripts, workers and audio
            // graph go with it.
            setLaunched(false);
            setReady(false);
          }}
          className="font-mono text-[9px] tracking-[0.2em] uppercase px-4 py-2 border transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
          style={{ borderColor: 'var(--ut-border)', color: 'var(--ut-white-faint)' }}
        >
          Leave the room · unload it
        </button>
      </div>
      <div className="w-full relative" style={{ height: heightCalc, minHeight, background }}>
        {!ready && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background, zIndex: 1 }}
          >
            <div className="text-center">
              <div className="text-5xl mb-4" style={{ color: accent }}>⬡</div>
              <div
                className="font-mono text-[11px] tracking-[0.25em] uppercase"
                style={{ color: accent }}
              >
                Opening {title}
              </div>
            </div>
          </div>
        )}
        <iframe
          src={src}
          title={title}
          data-instrument-frame={dataPrefix}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
            background,
            opacity: ready ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
          allow="microphone; autoplay; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock"
          onLoad={() => setReady(true)}
        />
      </div>
    </div>
  );
}
