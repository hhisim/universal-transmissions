import { blogPosts, getPostBySlug, getRelatedPosts } from "@/data/blog-posts";
import type { Metadata } from "next";
import PostClient from "./PostClient";
export const revalidate = 300;

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata>
     {
  const post = getPostBySlug(params.slug);
  if (!post) return { title: "Not Found" };
  const canonicalUrl = `https://www.universal-transmissions.com/journal/${post.slug}`;
  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      url: canonicalUrl,
      publishedTime: post.publishedAt,
      authors: [post.author],
      images: post.heroImage ? [{ url: `https://www.universal-transmissions.com${post.heroImage}`, width: 1200, height: 630, alt: post.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: post.heroImage ? [`https://www.universal-transmissions.com${post.heroImage}`] : undefined,
    },
  };
}

export default function PostPage({ params }: Props) {
  const post = getPostBySlug(params.slug);
  if (!post) return <PostClient slug={params.slug} />;
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
            image: post.heroImage ? `https://www.universal-transmissions.com${post.heroImage}` : undefined,
            author: {
              "@type": "Person",
              name: post.author,
            },
            articleSection: post.tradition,
            keywords: post.tags.join(", "),
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `https://www.universal-transmissions.com/journal/${post.slug}`,
            },
          }),
        }}
      />
      <PostClient slug={params.slug} />
    </>
  );
}
