"use client";

import Link from "next/link";
import { useBlog } from "@/context/BlogContext";

const messages = {
  "pt-BR": {
    status: "404 — página não encontrada",
    title: "isso aqui não existe.",
    subtitle: "ou existe? it depends.",
    trace: [
      "NotFoundException: página não encontrada na linha 404",
      "  at Router.resolve(unknown_path)",
      "  at Browser.navigate(your_typo.ts:1)",
      "  at Human.click(link_errado.tsx:42)",
      "  at Fingers.pressEnter(teclado.ts:∞)",
    ],
    comment: "// provavelmente foi um typo. sempre é um typo.",
    suggestion: "o que você pode fazer:",
    options: [
      "voltar para a home e fingir que nada aconteceu",
      "verificar a URL (sim, tem que falar isso)",
      "abrir uma issue — ah espera, não tem repositório público",
      "aceitar que algumas páginas simplesmente não existem",
    ],
    home: "← voltar para o início",
    rubber: "🦆 debug com pato de borracha não vai ajudar aqui.",
  },
  en: {
    status: "404 — page not found",
    title: "this doesn't exist.",
    subtitle: "or does it? it depends.",
    trace: [
      "NotFoundException: page not found at line 404",
      "  at Router.resolve(unknown_path)",
      "  at Browser.navigate(your_typo.ts:1)",
      "  at Human.click(wrong_link.tsx:42)",
      "  at Fingers.pressEnter(keyboard.ts:∞)",
    ],
    comment: "// probably a typo. it's always a typo.",
    suggestion: "what you can do:",
    options: [
      "go back home and pretend nothing happened",
      "check the URL (yes, someone has to say it)",
      "open an issue — oh wait, there's no public repo",
      "accept that some pages simply don't exist",
    ],
    home: "← back to home",
    rubber: "🦆 rubber duck debugging won't help here.",
  },
};

export default function NotFound() {
  const { language } = useBlog();
  const m = messages[language];

  return (
    <div className="mt-8">
      <span className="retro-date block mb-4">{m.status}</span>

      <h1
        className="text-3xl sm:text-4xl font-bold"
        style={{ fontFamily: "Georgia, serif" }}
      >
        {m.title}
      </h1>
      <p className="retro-muted mt-1 text-lg italic">{m.subtitle}</p>

      <hr className="my-6" />

      {/* fake stack trace */}
      <div
        style={{
          background: "var(--retro-pre-bg)",
          color: "var(--retro-pre-fg)",
          fontFamily: "'Courier New', monospace",
          fontSize: "12px",
          padding: "1rem",
          border: "1px solid var(--retro-border)",
          lineHeight: "1.8",
          overflowX: "auto",
        }}
      >
        {m.trace.map((line, i) => (
          <div key={i}>
            {i === 0 ? (
              <span style={{ color: "#ee7766" }}>{line}</span>
            ) : (
              <span style={{ color: "var(--retro-pre-fg)", opacity: 0.7 }}>
                {line}
              </span>
            )}
          </div>
        ))}
        <div style={{ marginTop: "0.75rem", color: "#9a9a7a" }}>
          {m.comment}
        </div>
      </div>

      <div className="mt-8">
        <p className="retro-muted text-sm mb-3">{m.suggestion}</p>
        <ul
          style={{
            listStyleType: "square",
            paddingLeft: "1.25rem",
            fontSize: "14px",
          }}
        >
          {m.options.map((opt, i) => (
            <li key={i} className="mb-2 retro-muted">
              {opt}
            </li>
          ))}
        </ul>
      </div>

      <hr className="my-8" />

      <div className="flex flex-col gap-3">
        <Link href="/" className="retro-link text-sm">
          {m.home}
        </Link>
        <p
          className="retro-muted"
          style={{ fontFamily: "'Courier New', monospace", fontSize: "12px" }}
        >
          {m.rubber}
        </p>
      </div>
    </div>
  );
}
