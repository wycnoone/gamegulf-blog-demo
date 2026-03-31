# GameGulf Blog

A static content site for `www.gamegulf.com/blog`, built with **Astro** and **React Islands**. Generates multilingual game buying guides from Markdown, optimized for search engines and AI citation.

## Tech stack

- **Astro 5** — static site generator with zero-JS-by-default output
- **React** — interactive islands for search, filtering, and mode switching
- **Content Collections** — Zod-validated Markdown with typed frontmatter
- **@astrojs/sitemap** — automatic sitemap generation

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:4321/blog`

## Build

```bash
npm run build
```

Static files are written to `dist/`. Deploy the contents of `dist/` to your server's `/blog/` path.

## Project structure

```
src/
├── content/
│   ├── config.ts              # Content Collections schema (Zod)
│   └── posts/{locale}/*.md    # Markdown articles per language
├── components/
│   ├── BlogShell.astro        # Site shell (header, nav, footer)
│   ├── DecisionHomeHub.tsx    # Blog home (React island)
│   ├── DecisionCategoryHub.tsx # Category page (React island)
│   ├── DecisionFeaturedCardV2.tsx
│   ├── DecisionGridCard.tsx
│   ├── DecisionFilterPanel.tsx
│   ├── DecisionEmptyState.tsx
│   ├── TrustModule.tsx
│   └── FaqList.astro
├── layouts/
│   └── BaseLayout.astro       # Root HTML layout with SEO meta
├── lib/
│   ├── blog.ts                # Content API + card model logic
│   ├── decision-card-display.ts
│   └── i18n.ts                # Locale registry and helpers
├── pages/
│   ├── index.astro            # Language selector (/blog/)
│   ├── 404.astro
│   ├── robots.txt.ts
│   └── [locale]/
│       ├── index.astro        # Blog home (/blog/en/)
│       ├── [slug].astro       # Article detail page
│       └── guides/
│           └── [topic].astro  # Guide aggregation page
└── styles/
    └── globals.css            # All CSS (variables, components, responsive)
```

## Multilingual strategy

### URL structure — subdirectory per language

Every language gets its own subdirectory under `/blog/`:

```
/blog/en/zelda-tears-of-the-kingdom
/blog/zh-hans/zelda-tears-of-the-kingdom
/blog/ja/zelda-tears-of-the-kingdom
```

This is the best approach for SEO and GEO (Generative Engine Optimization):

- Each language version is independently indexable by search engines and AI crawlers
- `hreflang` tags link translations together, with `x-default` pointing to the English version
- All language versions share the domain authority of `gamegulf.com`
- AI answer engines can cite the correct language URL directly

### Content files — one Markdown file per language per article

```
src/content/posts/
├── en/
│   ├── zelda-tears-of-the-kingdom.md
│   └── persona-5-royal-worth-it.md
├── zh-hans/
│   ├── zelda-tears-of-the-kingdom.md
│   └── persona-5-royal-worth-it.md
├── ja/   (future)
├── ko/   (future)
└── ...
```

**Why one file per language instead of bundling all languages into one file:**

- Astro Content Collections treat one file as one entry — the framework works best this way
- Each file stays small (6–10 KB), easy to edit and review
- Git diffs are clean — changing Chinese content only touches `zh-hans/` files
- Progressive translation is natural — a missing file simply means that language version doesn't exist yet
- AI-assisted translation works well with small, focused files

**Scaling projection:** 10 languages × 100 articles = 1,000 files. Astro handles this without issues (comparable to MDN, Docusaurus, and other large docs sites).

### Adding a new language

1. Add the locale code to `src/lib/i18n.ts` (`locales` array and `localeLabels` map)
2. Create `src/content/posts/{new-locale}/` directory
3. Add translated `.md` files using the same slug as the English version
4. `hreflang` generation and sitemap inclusion happen automatically

Use BCP 47 language codes: `en`, `zh-hans`, `zh-hant`, `ja`, `ko`, `es`, `pt-br`, `de`, `fr`, `ru`, etc.

### Locale configuration

All locale definitions live in `src/lib/i18n.ts`:

- `locales` — list of enabled locale codes
- `defaultLocale` — fallback locale (`en`)
- `localeLabels` — display name for each locale
- `isLocale()` — type guard for runtime validation

### Cross-language linking

- Same slug across languages = automatic alternate link (`getAlternatePostPath` in `blog.ts`)
- If a translation doesn't exist, that language is excluded from `hreflang` tags
- The language selector on `/blog/` links to each locale's homepage

## Content workflow

1. Create or edit a `.md` file in `src/content/posts/{locale}/`
2. Push to `main` branch
3. GitHub Actions builds and deploys automatically

You can also edit Markdown directly on GitHub's web interface.

### Translation workflow

1. Copy the English `.md` file to the target locale directory
2. Translate frontmatter fields: `title`, `description`, `decision`, `priceSignal`, `heroNote`, `listingTakeaway`, `whatItIs`, `avoidIf`, `consensusPraise`, `mainFriction`, `timeFit`, `fitLabel`, `playStyle`, `timeCommitment`, `playMode`, `whyNow`, `takeaway`, `bestFor`, `timingNote`, `communityVibe`, `playtime`, `faq`, `tags`
3. Translate the article body
4. Keep unchanged: `publishedAt`, `updatedAt`, `category`, `gameTitle`, `platform`, `author`, `wishlistHref`, `priceTrackHref`, `gameHref`, `membershipHref`, `coverImage`, `heroTheme`, `actionBucket`, `quickFilters`, `playerNeeds`, `verdict`, `priceCall`, `confidence`, `featuredPriority`, `badge`, `reviewSignal`

## SEO / GEO

Each article page outputs:
- `BlogPosting` + `BreadcrumbList` + `FAQPage` JSON-LD
- `hreflang` tags linking all available language versions
- `x-default` hreflang pointing to the English version
- Open Graph and Twitter Card meta
- Canonical URLs per language
- `robots.txt` allows major AI crawlers (GPTBot, PerplexityBot, ClaudeBot)

## Deployment

Configured for `www.gamegulf.com/blog` via `base: '/blog'` in `astro.config.mjs`.

GitHub Actions workflow at `.github/workflows/deploy.yml` handles build. Server deployment step is commented out — uncomment and configure with your server credentials.

## Content templates

Reference templates for writing new articles are in `content/templates/`:

- `game-guide-template.md` — unified frontmatter reference and article structure for all game guides (covers both "worth-it" and "buy-now-or-wait" categories)
- `article-generation-prompt.md` — AI prompt for generating new articles from structured game data
