import type { Metadata } from "next";
import "./globals.css";
import PageBackground from "@/components/ui/PageBackground";

export const metadata: Metadata = {
  title: {
    default: "Universal Transmissions — Sacred Art & Symbolic Code",
    template: "%s | Universal Transmissions",
  },
  description:
    "Universal Transmissions — The visual lexicon of hidden knowledge. Sacred geometry, symbolic art, and the Codex Oracle by Hakan Hisim.",
  keywords: [
    "Universal Transmissions",
    "Hakan Hisim",
    "Codex Oracle",
    "sacred geometry",
    "symbolic art",
    "universal transmissions",
  ],
  authors: [{ name: "Hakan Hisim" }],
  creator: "Hakan Hisim",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.universal-transmissions.net",
    siteName: "Universal Transmissions",
    title: "Universal Transmissions — Sacred Art & Symbolic Code",
    description:
      "The visual lexicon of hidden knowledge. Sacred geometry, symbolic art, and the Codex Oracle.",
    images: [
      {
        url: "https://www.universal-transmissions.net/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Universal Transmissions",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Universal Transmissions",
    description: "The visual lexicon of hidden knowledge.",
    creator: "@hakanhisim",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <style>{`
          vaahvercelanalytics,
          [data-w-vercelanalytics],
          #vercel-analytics,
          [id*="vercel-analytics"] {
            display: none !important;
            visibility: hidden !important;
          }
        `}</style>
      </head>
      <body className="antialiased">
        <PageBackground />
        {children}
      </body>
    </html>
  );
}
