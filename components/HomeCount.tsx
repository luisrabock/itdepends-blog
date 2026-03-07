"use client";

import { useBlog } from "@/context/BlogContext";
import { t } from "@/lib/translations";

export default function HomeCount({ count }: { count: number }) {
  const { language } = useBlog();
  const tr = t(language);

  return <p className="retro-muted text-sm">{tr.publishedCount(count)}</p>;
}
