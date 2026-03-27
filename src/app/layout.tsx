import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import PageBackground from "@/components/ui/PageBackground";

export const metadata: Metadata = {
  verification: {
    google: 'N_Zt8XImandmsyzfEnqu1YttaDdnOool9Oh95rzS9FI',
  },
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
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
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
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-793DRYHJP0" />
        <script dangerouslySetInnerHTML={{ __html: "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-793DRYHJP0');" }} />
      </head>
      <body className="antialiased">
        <PageBackground />
        <Analytics />
        {children}
      </body>
    </html>
  );
}