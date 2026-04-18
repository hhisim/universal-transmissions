import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Oracle Correspondence Orbit | Universal Transmissions',
  description: 'The correspondence lattice now opens inside the live Oracle cockpit.',
  alternates: {
    canonical: 'https://www.universal-transmissions.com/oracle',
  },
  openGraph: {
    title: 'Oracle Correspondence Orbit | Universal Transmissions',
    description: 'Matrix, symbols, letters, decode, and clusters orbit the Oracle interface.',
    url: 'https://www.universal-transmissions.com/oracle',
    type: 'website',
  },
}

export default function CodexLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
