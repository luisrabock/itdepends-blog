"use client";

import { useBlog } from "@/context/BlogContext";

export default function LangToggle() {
  const { language, toggleLanguage } = useBlog();

  return (
    <button
      onClick={toggleLanguage}
      className="retro-link text-sm cursor-pointer"
      aria-label="toggle language"
      style={{ background: "none", border: "none", padding: 0 }}
    >
      {language === "pt-BR" ? "en" : "pt-br"}
    </button>
  );
}
