import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Correspondence Codex — Universal Transmissions',
  description: '824-entry symbolic lattice — alchemy, archetypes, chakras, geometry, and beyond.',
  metadataBase: new URL('https://www.universal-transmissions.com'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#02020a" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>{children}</body>
    </html>
  );
}