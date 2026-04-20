'use client';

import { useEffect, useState } from 'react';

export default function CodexLoader() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fallback = window.setTimeout(() => setLoaded(true), 2200);
    return () => window.clearTimeout(fallback);
  }, []);

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 220px)', minHeight: '720px', background: '#02020a', position: 'relative' }}>
      {!loaded && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#02020a', zIndex: 1 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', color: '#e040fb' }}>⬡</div>
            <div style={{ fontFamily: 'Cinzel, serif', color: '#e040fb', letterSpacing: '0.2em', fontSize: '14px' }}>
              LOADING CODEX
            </div>
          </div>
        </div>
      )}
      <iframe
        src="/experience/correspondence-codex/codex.html"
        title="Correspondence Codex"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block', background: '#02020a', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
        allow="microphone; autoplay; fullscreen"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
