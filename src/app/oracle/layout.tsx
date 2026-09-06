import type { Metadata } from 'next'
import { absoluteUrl, DEFAULT_OG_IMAGE, DEFAULT_OG_IMAGE_HEIGHT, DEFAULT_OG_IMAGE_WIDTH, SITE_URL } from '@/lib/seo'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Codex Oracle — Consult the Sacred Code | Universal Transmissions',
  description: 'Consult the Codex Oracle. A symbolic divination system built from Universal Transmissions\' sacred geometry and alchemical imagery.',
  alternates: {
    canonical: '/oracle',
  },
  openGraph: {
    title: 'Codex Oracle | Universal Transmissions',
    description: 'Consult the sacred code through symbolic divination.',
    url: absoluteUrl('/oracle'),
    type: 'website',
    images: [{
      url: absoluteUrl(DEFAULT_OG_IMAGE),
      width: DEFAULT_OG_IMAGE_WIDTH,
      height: DEFAULT_OG_IMAGE_HEIGHT,
      alt: 'Codex Oracle by Universal Transmissions',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Codex Oracle | Universal Transmissions',
    description: 'Consult the sacred code through symbolic divination.',
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
}

export default function OracleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
