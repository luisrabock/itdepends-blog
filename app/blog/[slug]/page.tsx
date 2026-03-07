import { getAllSlugs, getPostBothLangs } from "@/lib/posts";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PostContent from "@/components/PostContent";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const slugs = getAllSlugs();
  if (!slugs.includes(slug)) return {};
  const posts = await getPostBothLangs(slug);
  const post = posts["pt-BR"];
  return {
    title: `${post.title} — it depends`,
    description: post.description,
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const slugs = getAllSlugs();
  if (!slugs.includes(slug)) notFound();

  const posts = await getPostBothLangs(slug);

  return <PostContent posts={posts} />;
}
