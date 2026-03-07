"use client";

import Link from "next/link";
import { useBlog } from "@/context/BlogContext";
import { t } from "@/lib/translations";

export function BackLink() {
  const { language } = useBlog();
  return (
    <Link href="/" className="retro-link text-sm">
      {t(language).back}
    </Link>
  );
}

export function AllPostsLink() {
  const { language } = useBlog();
  return (
    <Link href="/" className="retro-link text-sm">
      {t(language).allPosts}
    </Link>
  );
}
