import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Codex Oracle — Consult the Sacred Code | Universal Transmissions',
  description: 'Consult the Codex Oracle. A symbolic divination system built from Universal Transmissions\' sacred geometry and alchemical imagery.',
  alternates: {
    canonical: 'https://www.universal-transmissions.com/oracle',
  },
  openGraph: {
    title: 'Codex Oracle | Universal Transmissions',
    description: 'Consult the sacred code through symbolic divination.',
    url: 'https://www.universal-transmissions.com/oracle',
    type: 'website',
  },
}

export default function OracleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
