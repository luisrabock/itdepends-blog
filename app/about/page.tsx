"use client";

import { useBlog } from "@/context/BlogContext";
import { t } from "@/lib/translations";
import { BackLink } from "@/components/PostNav";
import PixelTechIcons from "@/components/PixelTechIcons";

export default function About() {
  const { language } = useBlog();
  const tr = t(language);

  return (
    <div>
      <BackLink />

      <div className="mt-8">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {tr.greeting}
        </h1>
        <p className="retro-date mt-1">{tr.role}</p>
      </div>

      <div className="retro-prose mt-8">
        <p>{tr.bio}</p>
        <p>{tr.focus}</p>

        <h2>{tr.techTitle}</h2>
        <div className="mt-4 mb-6">
          <PixelTechIcons size={48} showLabels={true} />
        </div>

        <h2>{tr.contactTitle}</h2>
        <ul>
          <li>
            <a
              href="https://github.com/luisrabock"
              className="retro-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/luisrabock
            </a>
          </li>

          <li>
            <a href="mailto:luis.rabock@gmail.com" className="retro-link">
              luis.rabock@gmail.com
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
