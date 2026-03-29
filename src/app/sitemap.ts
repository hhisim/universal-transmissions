import { MetadataRoute } from "next";
import { artworks } from "@/data/artworks";
import { products } from "@/data/products";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.universal-transmissions.com";

  const staticPages = ["", "/gallery", "/codex", "/store", "/journal", "/connect"].map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  const artworkPages = artworks.map((a) => ({
    url: `${base}/gallery/${a.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const productPages = products.map((p) => ({
    url: `${base}/store/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...artworkPages, ...productPages];
}
