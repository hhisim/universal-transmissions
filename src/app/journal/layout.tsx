import type { Metadata } from 'next'
import { absoluteUrl, DEFAULT_OG_IMAGE, DEFAULT_OG_IMAGE_HEIGHT, DEFAULT_OG_IMAGE_WIDTH, SITE_URL } from '@/lib/seo'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Journal — Art & Symbol Essays',
  description: 'Essays on sacred geometry, symbolic art, alchemy, and the visual language of hidden knowledge. By Hakan Hisim.',
  alternates: {
    canonical: '/journal',
  },
  openGraph: {
    title: 'Journal | Universal Transmissions',
    description: 'Essays on sacred geometry and symbolic art.',
    url: absoluteUrl('/journal'),
    type: 'website',
    images: [{
      url: absoluteUrl(DEFAULT_OG_IMAGE),
      width: DEFAULT_OG_IMAGE_WIDTH,
      height: DEFAULT_OG_IMAGE_HEIGHT,
      alt: 'Universal Transmissions journal',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Journal | Universal Transmissions',
    description: 'Essays on sacred geometry and symbolic art.',
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
}

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
