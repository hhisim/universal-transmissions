import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import PageBackground from "@/components/ui/PageBackground";

export const metadata: Metadata = {
  title: {
    default: "Universal Transmissions — Sacred Art & Symbolic Code",
    template: "%s | Universal Transmissions",
  },
  description:
    "Universal Transmissions — The visual lexicon of hidden knowledge. Sacred geometry, symbolic art, and the Codex Oracle by Hakan Hisim.",
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
      <body className="antialiased">
        <PageBackground />
        <Analytics />
        {children}
      </body>
    </html>
  );
}