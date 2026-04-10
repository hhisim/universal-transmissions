import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sanctum — Sacred Art & Codex Oracle | Universal Transmissions',
  description: 'The Sanctum. Sacred geometry art, symbolic code, and the Codex Oracle. Hakan Hisim\'s visual lexicon of hidden knowledge.',
  alternates: {
    canonical: 'https://www.universal-transmissions.com/sanctum',
  },
  openGraph: {
    title: 'Sanctum | Universal Transmissions',
    description: 'Sacred art, symbolic code, and the Codex Oracle.',
    url: 'https://www.universal-transmissions.com/sanctum',
    type: 'website',
  },
}

export default function SanctumLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
