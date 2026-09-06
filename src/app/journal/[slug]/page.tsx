import { blogPosts, getPostBySlug, getRelatedPosts } from "@/data/blog-posts";
import type { Metadata } from "next";
import PostClient from "./PostClient";
import {
  absoluteUrl,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_WIDTH,
  SITE_URL,
  seoDescription,
  seoTitle,
} from "@/lib/seo";
export const revalidate = 300;

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPostBySlug(params.slug);
  if (!post) return { title: "Not Found", robots: { index: false, follow: false } };
  const canonicalUrl = `${SITE_URL}/journal/${post.slug}`;
  const imageUrl = absoluteUrl(post.heroImage || DEFAULT_OG_IMAGE);
  const metaTitle = seoTitle(post.title);
  const metaDescription = seoDescription(post.excerpt);
  return {
    title: metaTitle,
    description: metaDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      url: canonicalUrl,
      publishedTime: post.publishedAt,
      authors: [post.author],
      images: [{
        url: imageUrl,
        width: DEFAULT_OG_IMAGE_WIDTH,
        height: DEFAULT_OG_IMAGE_HEIGHT,
        alt: post.title,
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description: metaDescription,
      images: [imageUrl],
    },
  };
}

export default function PostPage({ params }: Props) {
  const post = getPostBySlug(params.slug);
  if (!post) return <PostClient slug={params.slug} />;
  const imageUrl = absoluteUrl(post.heroImage || DEFAULT_OG_IMAGE);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.excerpt,
            datePublished: post.publishedAt,
            dateModified: post.publishedAt,
            image: imageUrl,
            author: {
              "@type": "Person",
              name: post.author,
            },
            articleSection: post.tradition,
            keywords: post.tags.join(", "),
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `${SITE_URL}/journal/${post.slug}`,
            },
          }),
        }}
      />
      <PostClient slug={params.slug} />
    </>
  );
}
