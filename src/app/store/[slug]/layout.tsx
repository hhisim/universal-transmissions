import type { Metadata } from "next";
import { getProduct, products } from "@/data/products";
import {
  absoluteUrl,
  DEFAULT_OG_IMAGE,
  seoDescription,
  seoTitle,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_WIDTH,
  SITE_URL,
} from "@/lib/seo";

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = getProduct(params.slug);
  if (!product) {
    return { title: "Not Found", robots: { index: false, follow: false } };
  }

  const canonicalUrl = `${SITE_URL}/store/${product.slug}`;
  const imageUrl = absoluteUrl(product.images[0] || DEFAULT_OG_IMAGE);
  const metadataTitle = seoTitle(product.title.replace(/^Universal Transmissions\s*/i, ""), 36);
  const metadataDescription = seoDescription(product.description);
  return {
    metadataBase: new URL(SITE_URL),
    title: metadataTitle,
    description: metadataDescription,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: metadataTitle,
      description: metadataDescription,
      type: "website",
      url: canonicalUrl,
      images: [{
        url: imageUrl,
        width: DEFAULT_OG_IMAGE_WIDTH,
        height: DEFAULT_OG_IMAGE_HEIGHT,
        alt: metadataTitle,
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: metadataTitle,
      description: metadataDescription,
      images: [imageUrl],
    },
  };
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}
