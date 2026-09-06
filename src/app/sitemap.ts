import { MetadataRoute } from "next";
import { artworks } from "@/data/artworks";
import { products } from "@/data/products";
import { blogPosts } from "@/data/blog-posts";
import { SITE_URL } from "@/lib/seo";

const staticPages = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" as const },
  { path: "/gallery", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/codex", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/journal", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/connect", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/sanctum", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/oracle/plans", priority: 0.8, changeFrequency: "monthly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries = staticPages.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));

  const artworkPages = artworks.map((artwork) => ({
    url: `${SITE_URL}/gallery/${artwork.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const productPages = products.map((product) => ({
    url: `${SITE_URL}/store/${product.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const journalPages = blogPosts.map((post) => ({
    url: `${SITE_URL}/journal/${post.slug}`,
    lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const allEntries = [...staticEntries, ...journalPages, ...artworkPages, ...productPages];
  const seen = new Set<string>();
  return allEntries.filter((entry) => {
    if (seen.has(entry.url)) return false;
    seen.add(entry.url);
    return true;
  });
}
