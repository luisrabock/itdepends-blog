"use client";

import { useBlog } from "@/context/BlogContext";
import { t } from "@/lib/translations";

export default function SearchBar() {
  const { searchQuery, setSearchQuery, language } = useBlog();
  const tr = t(language);

  return (
    <div className="mt-6">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setSearchQuery("")}
        placeholder={tr.searchPlaceholder}
        className="retro-input w-full"
        aria-label={tr.searchAriaLabel}
      />
    </div>
  );
}
