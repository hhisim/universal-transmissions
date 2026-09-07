import type { Metadata } from "next";

export const SITE_URL = "https://www.universal-transmissions.com";
export const DEFAULT_OG_IMAGE = "/journal/voa-20260828/walter-russell-universal-one-cosmology-of-light.png";
export const DEFAULT_OG_IMAGE_WIDTH = 1672;
export const DEFAULT_OG_IMAGE_HEIGHT = 941;

export function absoluteUrl(pathOrUrl: string): string {
  return new URL(pathOrUrl, SITE_URL).toString();
}

export function seoTitle(value: string, maxLength = 34): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  const cut = clean.slice(0, maxLength - 1).replace(/\s+[^\s]*$/, "").trim();
  return `${cut || clean.slice(0, maxLength - 1)}…`;
}

export function seoDescription(value: string, maxLength = 155): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  const cut = clean.slice(0, maxLength - 1).replace(/\s+[^\s]*$/, "").trim();
  return `${cut || clean.slice(0, maxLength - 1)}…`;
}

type SeoOptions = {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  type?: "website" | "article";
  publishedTime?: string;
  authors?: string[];
};

export function seoMetadata({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  imageAlt = title,
  type = "website",
  publishedTime,
  authors,
}: SeoOptions): Metadata {
  const canonical = absoluteUrl(path);
  const imageUrl = absoluteUrl(image);
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type,
      url: canonical,
      siteName: "Universal Transmissions",
      images: [
        {
          url: imageUrl,
          width: DEFAULT_OG_IMAGE_WIDTH,
          height: DEFAULT_OG_IMAGE_HEIGHT,
          alt: imageAlt,
        },
      ],
      ...(publishedTime ? { publishedTime } : {}),
      ...(authors ? { authors } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}
