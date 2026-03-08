# it depends

Personal blog built with Next.js. Posts are written in Markdown and support two languages (pt-BR and English).

## Stack

- **Next.js 16** (App Router)
- **React 19**
- **Tailwind CSS v4**
- **Shadcn UI**
- **gray-matter** — parses post frontmatter
- **remark + remark-gfm + remark-html** — renders Markdown to HTML
- **TypeScript**

## Getting started

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

## Project structure

```
posts/            # pt-BR posts (canonical)
posts/en/         # English translations (optional, falls back to pt-BR)
app/              # Next.js App Router pages
components/       # UI components
lib/
  posts.ts        # getAllPostsMeta(), getPostBySlug()
  translations.ts # UI strings for pt-BR and en
context/
  BlogContext.tsx # language and search state
public/
  avatar.png      # header photo
  favicon.svg     # site favicon
```

## Writing posts

### pt-BR (required)

Create a `.md` file in `posts/` using the slug as the filename:

```
posts/my-post-slug.md
```

Frontmatter:

```md
---
title: "titulo do post"
date: "YYYY-MM-DD"
description: "descrição curta exibida na listagem"
tags: ["tag1", "tag2"]
---

Conteúdo em Markdown aqui.
```

The slug is derived from the filename. The post becomes available at `/blog/my-post-slug` immediately after saving.

### English translation (optional)

Create a file with the **same filename** inside `posts/en/`:

```
posts/en/my-post-slug.md
```

If no English file exists, the pt-BR version is shown to English visitors automatically.

### Supported Markdown

Posts are rendered with `remark-gfm`, so you can use:

- Headings (`##`, `###`)
- **Bold**, _italic_
- `inline code` and fenced code blocks
- Tables
- Unordered and ordered lists
- Horizontal rules (`---`)
- Links

### Code blocks

~~~md
```java
public class Example {
    public static void main(String[] args) {
        System.out.println("hello");
    }
}
```
~~~

## Tags

Tags are defined in frontmatter and displayed on each post. They are used for display only — there are no tag-filtered pages.

## Search

The search bar on the home page filters posts by title, description, and tags in real time. Runs entirely client-side.

## Language toggle

The UI and posts support `pt-BR` and `en`. The selected language is held in React context (no persistence between sessions).

## Build

```bash
npm run build
npm run start
```

## Lint

```bash
npm run lint
```