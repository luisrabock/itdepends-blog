"use client";

import { useBlog } from "@/context/BlogContext";
import { t } from "@/lib/translations";
import { BackLink, AllPostsLink } from "@/components/PostNav";
import type { Post } from "@/lib/posts";

interface Props {
  posts: {
    "pt-BR": Post;
    en: Post;
  };
}

function formatDate(dateStr: string, locale: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function PostContent({ posts }: Props) {
  const { language } = useBlog();
  const tr = t(language);
  const post = posts[language];

  return (
    <article>
      <BackLink />

      <header className="mt-6 mb-8">
        <span className="retro-date block mb-2">
          {formatDate(post.date, tr.dateLocale)}
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
          {post.title}
        </h1>
        {post.description && (
          <p className="retro-muted mt-2 text-base italic">{post.description}</p>
        )}
        {post.tags && post.tags.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {post.tags.map((tag) => (
              <span key={tag} className="retro-tag">
                {tag}
              </span>
            ))}
          </div>
        )}
        <hr className="mt-6" />
      </header>

      <div
        className="retro-prose"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      <hr className="mt-12" />
      <div className="mt-4">
        <AllPostsLink />
      </div>
    </article>
  );
}
