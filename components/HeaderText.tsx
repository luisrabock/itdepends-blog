"use client";

import { useBlog } from "@/context/BlogContext";
import { t } from "@/lib/translations";

export default function HeaderText() {
  const { language } = useBlog();
  const tr = t(language);

  return (
    <p className="retro-muted text-sm mt-1">
      by{" "}
      <span className="font-semibold" style={{ color: "var(--foreground)" }}>
        Luis
      </span>
      {" · "}
      {tr.subtitle}
    </p>
  );
}
