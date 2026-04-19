import { useEffect, useState } from 'react';

export default function CodexLoader() {
  const [error, setError] = useState(false);

  // The codex.html is a standalone document - use iframe to embed it cleanly
  return (
    <iframe
      src="/experience/correspondence-codex/codex.html"
      title="Correspondence Codex"
      style={{
        width: '100%',
        height: 'calc(100vh - 64px)',
        border: 'none',
        display: 'block',
        background: '#02020a',
      }}
      allow="microphone; autoplay; fullscreen"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock"
      onError={() => setError(true)}
    />
  );
}
