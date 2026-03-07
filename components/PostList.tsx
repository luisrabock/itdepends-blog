"use client";

import Link from "next/link";
import { PostMeta } from "@/lib/posts";
import { useBlog } from "@/context/BlogContext";
import { t } from "@/lib/translations";
import type { Language } from "@/lib/translations";

function formatDate(dateStr: string, locale: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface Props {
  posts: Record<Language, PostMeta[]>;
}

export default function PostList({ posts }: Props) {
  const { searchQuery, language } = useBlog();
  const tr = t(language);
  const list = posts[language];

  const filtered = list.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags?.some((tag) => tag.toLowerCase().includes(q))
    );
  });

  if (filtered.length === 0) {
    return (
      <p className="retro-muted text-sm mt-8">{tr.noResults(searchQuery)}</p>
    );
  }

  return (
    <ul className="mt-2 space-y-8">
      {filtered.map((post) => (
        <li key={post.slug} className="group">
          <span className="retro-date block text-xs mb-1">
            {formatDate(post.date, tr.dateLocale)}
          </span>
          <Link href={`/blog/${post.slug}`} className="retro-link block">
            <h2 className="text-lg font-bold leading-tight group-hover:underline">
              {post.title}
            </h2>
          </Link>
          {post.description && (
            <p className="retro-muted text-sm mt-1">{post.description}</p>
          )}
          {post.tags && post.tags.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {post.tags.map((tag) => (
                <span key={tag} className="retro-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
