import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
import type { Language } from "@/lib/translations";

const directories: Record<Language, string> = {
  "pt-BR": path.join(process.cwd(), "posts"),
  en: path.join(process.cwd(), "posts/en"),
};

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags?: string[];
}

export interface Post extends PostMeta {
  content: string;
}

function readMeta(slug: string, lang: Language): PostMeta | null {
  const dir = directories[lang];
  const fullPath = path.join(dir, `${slug}.md`);
  if (!fs.existsSync(fullPath)) return null;

  const { data } = matter(fs.readFileSync(fullPath, "utf8"));
  return {
    slug,
    title: data.title ?? slug,
    date: data.date ?? "",
    description: data.description ?? "",
    tags: data.tags ?? [],
  };
}

// Returns canonical slugs (from pt-BR directory)
export function getAllSlugs(): string[] {
  const dir = directories["pt-BR"];
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

// Returns post metadata for a given language, falls back to pt-BR
export function getAllPostsMeta(lang: Language = "pt-BR"): PostMeta[] {
  const slugs = getAllSlugs();
  const posts = slugs.map((slug) => readMeta(slug, lang) ?? readMeta(slug, "pt-BR")!);
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

async function parseContent(filePath: string): Promise<string> {
  const { content } = matter(fs.readFileSync(filePath, "utf8"));
  const processed = await remark()
    .use(remarkGfm)
    .use(remarkHtml, { sanitize: false })
    .process(content);
  return processed.toString();
}

// Returns the post for a given language, falls back to pt-BR
async function getPostBySlug(
  slug: string,
  lang: Language = "pt-BR"
): Promise<Post | null> {
  const preferredPath = path.join(directories[lang], `${slug}.md`);
  const fallbackPath = path.join(directories["pt-BR"], `${slug}.md`);

  const filePath = fs.existsSync(preferredPath) ? preferredPath : fallbackPath;
  if (!fs.existsSync(filePath)) return null;

  const { data } = matter(fs.readFileSync(filePath, "utf8"));
  const content = await parseContent(filePath);

  return {
    slug,
    title: data.title ?? slug,
    date: data.date ?? "",
    description: data.description ?? "",
    tags: data.tags ?? [],
    content,
  };
}

// Returns both language versions of a post for SSG
export async function getPostBothLangs(slug: string): Promise<{
  "pt-BR": Post;
  en: Post;
}> {
  const [ptPost, enPost] = await Promise.all([
    getPostBySlug(slug, "pt-BR"),
    getPostBySlug(slug, "en"),
  ]);

  return {
    "pt-BR": ptPost!,
    en: enPost ?? ptPost!,
  };
}
