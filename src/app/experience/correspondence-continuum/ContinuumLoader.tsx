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
        background: 'radial-gradient(circle at 50% 0%, rgba(19,50,69,0.32), rgba(0,2,5,0.96) 34%, #000205 72%)',
        position: 'relative',
        overflow: 'hidden',
        borderTop: '1px solid rgba(108, 218, 255, 0.18)',
        borderBottom: '1px solid rgba(212, 168, 71, 0.14)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), inset 0 24px 80px rgba(0,245,255,0.06), 0 20px 80px rgba(0,0,0,0.42)',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(127,235,255,0.06) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 78%, rgba(212,168,71,0.05) 100%)', zIndex: 1 }} />
      {!loaded && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,6,14,0.72)', zIndex: 2 }}>
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
