'use client';

import { useEffect, useState } from 'react';

export default function ContinuumLoader() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fallback = window.setTimeout(() => setLoaded(true), 2600);
    return () => window.clearTimeout(fallback);
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: 'calc(100vh - 118px)',
        minHeight: '940px',
        background: '#000205',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {!loaded && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,6,14,0.72)', zIndex: 1 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', color: '#e040fb' }}>⬡</div>
            <div style={{ fontFamily: 'Cinzel, serif', color: '#e040fb', letterSpacing: '0.2em', fontSize: '14px' }}>
              LOADING CONTINUUM
            </div>
          </div>
        </div>
      )}
      <iframe
        src="/experience/correspondence-continuum/index.html"
        title="Correspondence Continuum"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block', background: '#000205', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
        allow="microphone; autoplay; fullscreen"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
