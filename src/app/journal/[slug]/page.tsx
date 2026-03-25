import { blogPosts, getPostBySlug, getRelatedPosts } from "@/data/blog-posts";
import type { Metadata } from "next";
import PostClient from "./PostClient";
import PageBackground from "@/components/scenes/PageBackground";

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata>
    <PageBackground variant="journal" /> {
  const post = getPostBySlug(params.slug);
  if (!post) return { title: "Not Found" };
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
      authors: [post.author],
    },
  };
}

export default function PostPage({ params }: Props) {
  return <PostClient slug={params.slug} />;
}
