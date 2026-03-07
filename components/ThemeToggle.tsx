"use client";

import { useBlog } from "@/context/BlogContext";

// Pixel-art sun — 2000s style
function SunIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="#f5c400"
      aria-hidden="true"
      style={{ display: "inline", verticalAlign: "middle" }}
    >
      {/* center */}
      <rect x="5" y="5" width="4" height="4" />
      {/* cardinal rays */}
      <rect x="6" y="1" width="2" height="2" />
      <rect x="6" y="11" width="2" height="2" />
      <rect x="1" y="6" width="2" height="2" />
      <rect x="11" y="6" width="2" height="2" />
      {/* diagonal rays */}
      <rect x="2" y="2" width="2" height="2" />
      <rect x="10" y="2" width="2" height="2" />
      <rect x="2" y="10" width="2" height="2" />
      <rect x="10" y="10" width="2" height="2" />
    </svg>
  );
}

// Pixel-art crescent moon — 2000s style
function MoonIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="#1a1a2e"
      aria-hidden="true"
      style={{ display: "inline", verticalAlign: "middle" }}
    >
      {/* outer circle pixels */}
      <rect x="4" y="1" width="4" height="2" />
      <rect x="2" y="3" width="2" height="2" />
      <rect x="2" y="5" width="2" height="4" />
      <rect x="2" y="9" width="2" height="2" />
      <rect x="4" y="11" width="4" height="2" />
      <rect x="8" y="9" width="2" height="2" />
      <rect x="8" y="5" width="2" height="2" />
      {/* fill inner left */}
      <rect x="4" y="3" width="4" height="8" />
      <rect x="8" y="4" width="2" height="2" />
      <rect x="8" y="8" width="2" height="1" />
    </svg>
  );
}

export default function ThemeToggle() {
  const { theme, toggleTheme } = useBlog();

  return (
    <button
      onClick={toggleTheme}
      className="retro-link cursor-pointer"
      aria-label="toggle theme"
      title={theme === "light" ? "dark mode" : "light mode"}
      style={{ background: "none", border: "none", padding: 0, lineHeight: 1 }}
    >
      {theme === "light" ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
