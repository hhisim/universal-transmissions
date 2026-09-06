import type { Metadata } from "next";
import { absoluteUrl, DEFAULT_OG_IMAGE, DEFAULT_OG_IMAGE_HEIGHT, DEFAULT_OG_IMAGE_WIDTH, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Connect — The Tribe",
  description:
    "Join the Universal Transmissions collective — reach out to Hakan Hisim, request custom commissions, discuss symbolic art, or simply say hello.",
  alternates: {
    canonical: "/connect",
  },
  openGraph: {
    title: "Connect | Universal Transmissions",
    description:
      "Join the Universal Transmissions collective and connect with Hakan Hisim.",
    url: absoluteUrl("/connect"),
    type: "website",
    images: [{
      url: absoluteUrl(DEFAULT_OG_IMAGE),
      width: DEFAULT_OG_IMAGE_WIDTH,
      height: DEFAULT_OG_IMAGE_HEIGHT,
      alt: "Connect with Universal Transmissions",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Connect | Universal Transmissions",
    description:
      "Join the Universal Transmissions collective and connect with Hakan Hisim.",
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
};

export default function ConnectLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
