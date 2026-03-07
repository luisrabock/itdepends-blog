"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import type { Language } from "@/lib/translations";

export type Theme = "light" | "dark";

interface BlogContextType {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  language: Language;
  toggleLanguage: () => void;
  theme: Theme;
  toggleTheme: () => void;
}

const BlogContext = createContext<BlogContextType>({
  searchQuery: "",
  setSearchQuery: () => {},
  language: "pt-BR",
  toggleLanguage: () => {},
  theme: "light",
  toggleTheme: () => {},
});

export function BlogProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") return "pt-BR";
    const stored = localStorage.getItem("lang");
    return stored === "en" || stored === "pt-BR" ? stored : "pt-BR";
  });
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem("theme");
    return stored === "dark" || stored === "light" ? stored : "light";
  });

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  function toggleLanguage() {
    const next: Language = language === "pt-BR" ? "en" : "pt-BR";
    setLanguage(next);
    localStorage.setItem("lang", next);
  }

  function toggleTheme() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
  }

  return (
    <BlogContext.Provider
      value={{ searchQuery, setSearchQuery, language, toggleLanguage, theme, toggleTheme }}
    >
      {children}
    </BlogContext.Provider>
  );
}

export function useBlog() {
  return useContext(BlogContext);
}
