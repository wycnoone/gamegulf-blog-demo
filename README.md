# GameGulf Blog

A blog module for `www.gamegulf.com/blog/...`, designed to support search discovery and AI citation with decision-first Nintendo Switch content.

## What is included

- `src/app/blog/[locale]` multi-language blog routes for `en` and `zh-hans`
- blog index, category list, and article detail pages
- Markdown content source under `content/posts`
- configurable metadata from frontmatter
- canonical, hreflang, `robots.txt`, and `sitemap.xml`
- FAQ and `BlogPosting` JSON-LD
- production article templates under `content/templates`

## Run locally

```bash
npm install
npm run dev
```

Open:

- `http://localhost:3000/`
- `http://localhost:3000/blog/en`
- `http://localhost:3000/blog/zh-hans`

## Static output

This project is configured for static export.

```bash
npm run build
npm run preview:static
```

Static files are written to `out/`.

## Notes

- The scripts use webpack mode because Next 16 Turbopack hit a Unicode-path panic in this workspace path.
- `NEXT_PUBLIC_SITE_URL` can be set to override the default production canonical base URL.
- Production deployment can serve the `out/` directory directly without running a long-lived Next server.

## Content model

Each article is a Markdown file with frontmatter for:

- `title`
- `description`
- `publishedAt`
- `category`
- `gameTitle`
- `decision`
- CTA URLs
- FAQ items

Optional display and SEO helpers:

- `coverImage`
- `badge`
- `heroTheme`
- `ctaLabelOverride`

This keeps the content model simple while leaving room for later CMS or AI-assisted workflow expansion.

## Editorial standard

Each article should work for both search users and AI answer systems:

- explain what the game is, not only whether it is cheap
- summarize gameplay, story tone, and player fit early
- extract common praise and complaints instead of copying raw reviews
- give a direct verdict before long explanation
- use GameGulf for the next step: live pricing, wishlist, or price tracking

In practice, every production article should answer six things:

1. What is this game?
2. Is it actually good?
3. Who is it for?
4. What do players tend to like or dislike?
5. Is now a good time to buy?
6. What should the reader do next on GameGulf?
