import type { Metadata } from "next";
import {
  absoluteUrl,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_WIDTH,
  SITE_URL,
} from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Oracle Plans",
  description: "Choose the Universal Transmissions Oracle access level that fits your practice: guest, free, or Initiate.",
  alternates: { canonical: "/oracle/plans" },
  openGraph: {
    type: "website",
    url: absoluteUrl("/oracle/plans"),
    title: "Oracle Plans | Universal Transmissions",
    description: "Choose the Universal Transmissions Oracle access level that fits your practice.",
    siteName: "Universal Transmissions",
    images: [{ url: absoluteUrl(DEFAULT_OG_IMAGE), width: DEFAULT_OG_IMAGE_WIDTH, height: DEFAULT_OG_IMAGE_HEIGHT, alt: "Universal Transmissions" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Oracle Plans | Universal Transmissions",
    description: "Choose the Universal Transmissions Oracle access level that fits your practice.",
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
};

export default function OraclePlansLayout({ children }: { children: React.ReactNode }) {
  return children;
}
