"use client";

import Link from "next/link";
import { useBlog } from "@/context/BlogContext";
import { t } from "@/lib/translations";
import LangToggle from "./LangToggle";
import ThemeToggle from "./ThemeToggle";

export default function NavLinks() {
  const { language } = useBlog();
  const tr = t(language);

  return (
    <nav className="mt-2 flex gap-3 text-sm items-center">
      <Link href="/" className="retro-link">
        {tr.posts}
      </Link>
      <span className="retro-muted">·</span>
      <Link href="/about" className="retro-link">
        {tr.about}
      </Link>
      <span className="retro-muted">·</span>
      <LangToggle />
      <span className="retro-muted">·</span>
      <ThemeToggle />
    </nav>
  );
}
