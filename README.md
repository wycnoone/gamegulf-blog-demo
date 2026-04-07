# GameGulf Blog

Static blog for **GameGulf** — decision-oriented game buying guides — served under `https://www.gamegulf.com/blog`. Built with **Astro 5** and **React** islands.

Helps players decide: **buy now, wait for sale, or skip?**

For editorial and product rules (tone, card copy, CTAs), see `[AGENTS.md](./AGENTS.md)`.

## Tech stack


| Piece                | Role                                                 |
| -------------------- | ---------------------------------------------------- |
| **Astro 5**          | Static site generation, content collections, layouts |
| **React 19**         | Islands: home hub, filters, topic grids              |
| **TypeScript**       | Types across `lib/` and components                   |
| **Node.js scripts**  | Data extraction, validation, queue management        |
| **@astrojs/sitemap** | Sitemap from built routes                            |


## Requirements

- **Node.js** 20+ (CI uses Node 24)
- **js-yaml** (runtime dependency for YAML validation)

## Local development

```bash
npm install
npm run dev
```

Open the URL Astro prints (default `http://localhost:4321`). With `base: '/blog'`, paths are under `/blog/`.

```bash
npm run build    # output: dist/
npm run preview  # serve dist/ locally
```

## Project structure

```
src/
├── content.config.ts             # posts collection: glob loader + Zod schema
├── content/
│   └── posts/{locale}/*.md       # one file per locale per slug
├── components/                   # Astro + React (.tsx islands)
├── layouts/BaseLayout.astro      # HTML shell, meta, JSON-LD hooks
├── lib/
│   ├── blog.ts                   # load posts, card models, SEO helpers
│   ├── decision-card-display.ts  # card pricing logic
│   ├── i18n.ts                   # locales, blogBasePath
│   └── topics.ts                 # guide topic definitions
├── pages/
│   ├── index.astro               # /blog/ language picker
│   ├── 404.astro
│   ├── robots.txt.ts
│   └── [locale]/
│       ├── index.astro           # locale home (decision hub)
│       ├── [slug].astro          # article detail (GEO-optimized)
│       └── guides/[topic].astro  # topic aggregation (SEO-optimized)
└── styles/globals.css

scripts/                          # automation pipeline
├── extract-game-brief.mjs        # Phase 1: data extraction
├── batch-extract.mjs             # batch extraction wrapper
├── check-existing.mjs            # dedup check before generation
├── validate-article.mjs          # article quality validation
└── queue-next.mjs                # generation queue management

content/
├── briefs/*.json                 # extracted game data (script output)
├── game-queue.json               # generation queue for automation
├── hltb-mapping.json             # GameGulf slug → HLTB ID mapping
└── templates/
    ├── synthesis-prompt.md        # AI article synthesis prompt
    ├── game-guide-template.md     # frontmatter field reference
    └── article-generation-prompt.md
```

## Article generation pipeline

Two-phase architecture: **scripts collect data, AI writes articles**.

```
GameGulf URL
    │
    ▼
┌─────────────────────────────┐
│  Phase 0: Dedup Check       │  node scripts/check-existing.mjs <url>
│  Is this game already done? │  Exit 0 = new, Exit 1 = exists
└─────────────┬───────────────┘
              │ NEW
              ▼
┌─────────────────────────────┐
│  Phase 1: Data Extraction   │  node scripts/extract-game-brief.mjs <url>
│  GameGulf prices + trends   │  → content/briefs/{slug}.json
│  Steam reviews + tags       │
│  HLTB playtime stats        │
│  Price analytics computed   │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Phase 2: AI Synthesis      │  Read brief + synthesis-prompt.md
│  Generate 7-language .md    │  → src/content/posts/{locale}/{slug}.md
│  articles from structured   │
│  data (no price fabrication)│
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Phase 3: Validation        │  node scripts/validate-article.mjs <files>
│  YAML, schema, char limits  │  Exit 0 = pass, Exit 1 = fail
└─────────────┬───────────────┘
              │ PASS
              ▼
┌─────────────────────────────┐
│  Phase 4: Build & Deploy    │  npm run build
│  Astro SSG → dist/          │  git push → GitHub Actions → Pages
└─────────────────────────────┘
```

### Quick start: generate a new game article

```bash
# 1. Check if it already exists
node scripts/check-existing.mjs https://www.gamegulf.com/detail/<gameId>

# 2. Extract game data
node scripts/extract-game-brief.mjs https://www.gamegulf.com/detail/<gameId>

# 3. [AI] Generate articles using content/briefs/{slug}.json + synthesis prompt

# 4. Validate
node scripts/validate-article.mjs src/content/posts/en/{slug}.md

# 5. Build
npm run build
```

### Queue-based automation (for OpenClaw / CI)

```bash
# Add games to the queue
node scripts/queue-next.mjs --add <url> [high|normal|low] [notes]

# Process queue loop
node scripts/queue-next.mjs              # get next pending game
node scripts/queue-next.mjs --mark-started <url>
# ... run pipeline phases 0-4 ...
node scripts/queue-next.mjs --mark-done <url>

# Check queue status
node scripts/queue-next.mjs --status
```

### npm script shortcuts

```bash
npm run brief -- <url>                  # extract single game
npm run brief:batch -- <url1> <url2>    # extract multiple games
npm run build                           # Astro build
npm run preview                         # local preview server
```

## Scripts reference


| Script                   | Purpose                                                             | Input            | Output                       |
| ------------------------ | ------------------------------------------------------------------- | ---------------- | ---------------------------- |
| `extract-game-brief.mjs` | Fetch game data from GameGulf, Steam, HLTB; compute price analytics | GameGulf URL     | `content/briefs/{slug}.json` |
| `batch-extract.mjs`      | Run extraction for multiple URLs                                    | Multiple URLs    | Multiple briefs              |
| `check-existing.mjs`     | Check if articles exist for a game                                  | GameGulf URL     | JSON: NEW or EXISTS          |
| `validate-article.mjs`   | Validate Markdown articles against schema and quality rules         | `.md` file paths | JSON: PASS/FAIL with errors  |
| `queue-next.mjs`         | Manage the generation queue                                         | Subcommands      | JSON status/game info        |


## Data sources

The extraction script pulls from three sources:


| Source            | Data collected                                                 | Method                     |
| ----------------- | -------------------------------------------------------------- | -------------------------- |
| **GameGulf**      | Regional prices, price trends, discount history, game metadata | Nuxt 3 SSR payload parsing |
| **Steam**         | Reviews, tags, description, screenshots                        | Steam Store API            |
| **HowLongToBeat** | Main story / completionist playtime                            | HLTB page scraping         |


Price analytics are computed from trend data: all-time low, discount frequency, sale patterns, and a `price_verdict` that drives article recommendations.

**Argentina (AR) is excluded** from all price data — purchases are not available there.

## Internationalization

**7 locales**: `en`, `zh-hans`, `ja`, `fr`, `es`, `de`, `pt`

URL pattern: `/blog/{locale}/{slug}`

Same slug across locales links translations via `hreflang`. Card prices display the global lowest price converted to each locale's primary currency.


| Locale         | Primary currency | Card price example |
| -------------- | ---------------- | ------------------ |
| en             | USD              | `$79.99 (€42.96)`  |
| zh-hans, ja    | JPY              | `¥7,900 (€42.96)`  |
| fr, es, de, pt | EUR              | `€42.96 (¥7,900)`  |


## Content & dates

- `**publishedAt`** (required, `YYYY-MM-DD`) — first publish.
- `**updatedAt**` (optional) — last substantive edit.

Listing cards show the latest of the two. Structured data uses `datePublished` / `dateModified`.

## SEO & GEO strategy


| Page type                       | Optimization target | Approach                                                              |
| ------------------------------- | ------------------- | --------------------------------------------------------------------- |
| Topic pages (`/guides/{topic}`) | Traditional SEO     | Static Astro components, `CollectionPage` schema, internal linking    |
| Article pages (`/{slug}`)       | GEO (AI search)     | Rich structured data, `Speakable`, FAQ schema, decision-first content |


Per article: `BlogPosting`, `BreadcrumbList`, `FAQPage`, `VideoGame`, `Review` JSON-LD; Open Graph; canonical per locale; visible breadcrumbs.

## AI Skill (for OpenClaw)

The `.cursor/skills/generate-game-article/` directory contains a complete skill definition for AI agents:

- `**SKILL.md**` — step-by-step pipeline instructions with hard constraints
- `**quality-checklist.md**` — comprehensive validation checklist

This enables external AI agents (like OpenClaw) to generate articles autonomously while maintaining quality through strict rules on pricing accuracy, character limits, and writing style.

## Deployment

- **Site URL**: `https://www.gamegulf.com` with `base: '/blog'`
- **GitHub Actions** (`.github/workflows/deploy.yml`): push to `main` → `npm ci` → `npm run build` → deploy `dist/` to GitHub Pages

## License

See repository settings on GitHub.