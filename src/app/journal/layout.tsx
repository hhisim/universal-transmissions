import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Journal — Art & Symbol Blog | Universal Transmissions',
  description: 'Essays on sacred geometry, symbolic art, alchemy, and the visual language of hidden knowledge. By Hakan Hisim.',
  alternates: {
    canonical: 'https://www.universal-transmissions.com/journal',
  },
  openGraph: {
    title: 'Journal | Universal Transmissions',
    description: 'Essays on sacred geometry and symbolic art.',
    url: 'https://www.universal-transmissions.com/journal',
    type: 'website',
  },
}

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
