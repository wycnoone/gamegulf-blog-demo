# GameGulf Blog

Static blog for **GameGulf** — decision-oriented game buying guides — served under `https://www.gamegulf.com/blog`. Built with **Astro 5** and **React** islands. Content is Markdown with Zod-validated frontmatter; output is static HTML with strong SEO (JSON-LD, hreflang, sitemap).

For editorial and product rules (tone, card copy, CTAs), see [`AGENTS.md`](./AGENTS.md).

## Tech stack

| Piece | Role |
|--------|------|
| **Astro 5** | Static site generation, content collections, layouts |
| **React 19** | Islands: home hub, filters, topic grids |
| **TypeScript** | Types across `lib/` and components |
| **@astrojs/sitemap** | Sitemap from built routes |
| **Shiki** | Code blocks in Markdown (`github-light`) |

## Requirements

- **Node.js** 20+ (CI uses Node 24)

## Local development

```bash
npm install
npm run dev
```

Open the URL Astro prints (default `http://localhost:4321`). With `base: '/blog'`, paths are under `/blog/` (e.g. `http://localhost:4321/blog/`).

```bash
npm run build    # output: dist/
npm run preview  # serve dist/ locally
```

## Project structure

```
src/
├── content/
│   ├── config.ts                 # posts collection schema (Zod)
│   └── posts/{locale}/*.md       # one file per locale per slug
├── components/                   # Astro + React (.tsx islands)
├── layouts/BaseLayout.astro      # HTML shell, meta, JSON-LD hooks
├── lib/
│   ├── blog.ts                   # load posts, card models, formatDate, SEO helpers
│   ├── decision-card-display.ts
│   ├── i18n.ts                   # locales, blogBasePath
│   └── topics.ts                 # guide topic definitions
├── pages/
│   ├── index.astro               # /blog/ language picker
│   ├── 404.astro
│   ├── robots.txt.ts
│   └── [locale]/
│       ├── index.astro           # locale home (decision hub)
│       ├── [slug].astro          # article
│       └── guides/[topic].astro  # topic aggregation
└── styles/globals.css
content/templates/                # authoring templates (not bundled)
```

## Content & dates

- **`publishedAt`** (required, `YYYY-MM-DD`) — first publish.
- **`updatedAt`** (optional) — last substantive edit. Listing cards and the article meta row show the **latest** of the two as the primary date (`en-US` short form, e.g. `Mar 31, 2026`). If `updatedAt` is set and differs from `publishedAt`, the article header also shows `Updated Mar 31, 2026`.

Structured data uses `datePublished` / `dateModified` accordingly.

## Internationalization

**Enabled locales** (see `src/lib/i18n.ts`): `en`, `zh-hans`.

URL pattern:

```text
/blog/en/<slug>
/blog/zh-hans/<slug>
```

Same **slug** across locales links translations (`hreflang` + alternates). Missing locale file = that language version is omitted from alternates.

**Add a language:** extend `locales` and `localeLabels` in `i18n.ts`, add `src/content/posts/<locale>/`, mirror slugs from English.

## Content workflow

1. Add or edit `src/content/posts/<locale>/<slug>.md` (match [`content/templates/game-guide-template.md`](./content/templates/game-guide-template.md)).
2. Push to `main`.

Optional: edit Markdown on GitHub in the browser; CI builds on every push to `main`.

## SEO

Per article: `BlogPosting`, `BreadcrumbList`, and `FAQPage` JSON-LD; Open Graph / Twitter; canonical per locale. `robots.txt` is generated in `src/pages/robots.txt.ts`.

## Deployment

- **Production site URL** is set in `astro.config.mjs` (`site: 'https://www.gamegulf.com'`, `base: '/blog'`).
- **GitHub Actions** (`.github/workflows/deploy.yml`): on push to `main`, `npm ci` → `npm run build` → deploy **`dist/`** to **GitHub Pages** (`actions/deploy-pages`). Configure the repo’s Pages source to GitHub Actions if needed.

## Templates & prompts

| File | Purpose |
|------|---------|
| `content/templates/game-guide-template.md` | Frontmatter reference + article structure |
| `content/templates/article-generation-prompt.md` | Prompt for generating guides from structured inputs |

## License / repo

See repository settings on GitHub for license if present.
