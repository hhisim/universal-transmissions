import type { Metadata } from 'next'
import { absoluteUrl, DEFAULT_OG_IMAGE, DEFAULT_OG_IMAGE_HEIGHT, DEFAULT_OG_IMAGE_WIDTH, SITE_URL } from '@/lib/seo'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Sanctum — Sacred Art & Oracle',
  description: 'The Sanctum. Sacred geometry art, symbolic code, and the Codex Oracle. Hakan Hisim\'s visual lexicon of hidden knowledge.',
  alternates: {
    canonical: '/sanctum',
  },
  openGraph: {
    title: 'Sanctum | Universal Transmissions',
    description: 'Sacred art, symbolic code, and the Codex Oracle.',
    url: absoluteUrl('/sanctum'),
    type: 'website',
    images: [{
      url: absoluteUrl(DEFAULT_OG_IMAGE),
      width: DEFAULT_OG_IMAGE_WIDTH,
      height: DEFAULT_OG_IMAGE_HEIGHT,
      alt: 'Universal Transmissions Sanctum',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sanctum | Universal Transmissions',
    description: 'Sacred art, symbolic code, and the Codex Oracle.',
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
}

export default function SanctumLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
