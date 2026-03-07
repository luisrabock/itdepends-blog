"use client";

import { useBlog } from "@/context/BlogContext";
import { t } from "@/lib/translations";

export default function FooterText() {
  const { language } = useBlog();
  const tr = t(language);

  return (
    <p
      className="retro-muted text-xs text-center"
      style={{ fontFamily: "'Courier New', monospace" }}
    >
      {tr.footer(new Date().getFullYear())}
    </p>
  );
}
