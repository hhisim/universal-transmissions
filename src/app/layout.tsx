import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import PageBackground from "@/components/ui/PageBackground";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import UTSessionSync from "@/components/auth/UTSessionSync";

export const metadata: Metadata = {
  verification: {
    google: ['387c5TKuDQhB8zKDt21HjoaRtPXIILoBbnSC_2E19fQ', 'N_Zt8XImandmsyzfEnqu1YttaDdnOool9Oh95rzS9FI'],
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
        <script dangerouslySetInnerHTML={{ __html: `
window.__utSetSession = function(email, plan) {
  try {
    if (email && plan) {
      localStorage.setItem('ut_session', JSON.stringify({ email: email, plan: plan }));
      window.__utSession = { email: email, plan: plan };
    } else {
      localStorage.removeItem('ut_session');
      window.__utSession = null;
    }
  } catch(e) {}
};
window.__utClearSession = function() {
  try {
    localStorage.removeItem('ut_session');
    window.__utSession = null;
  } catch(e) {}
};
window.__utGetSession = function() {
  try {
    var raw = localStorage.getItem('ut_session');
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return null;
};
` }} />
      </head>
      <body className="antialiased">
        <PageBackground />
        <Analytics />
        <UTSessionSync />
        <Navigation />
        <div className="min-h-screen flex flex-col pt-16">
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}