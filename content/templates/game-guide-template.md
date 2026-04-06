# GameGulf Game Guide — Unified Template

One Markdown file per game per language. This file drives **both** the listing card and the detail page automatically.

- **Frontmatter fields** → drive the **listing card** (optimized for SEO and user scanning)
- **Article body + FAQ** → drive the **detail page** (optimized for GEO / AI citation)

The `category` field controls the article's editorial angle:
- `worth-it` → focuses on whether the game is worth buying
- `buy-now-or-wait` → focuses on whether the current price justifies buying now

---

## SEO vs GEO: which fields serve which purpose

### Card fields → SEO (search crawlers + human scanning)

These fields render on the **listing card** and must be optimized for:
- Search engine snippet display
- Fast human scanning (≤10 seconds to decide whether to click)
- Clear, decision-first language

**Character limits are enforced by truncation — write within them:**

| Field | Max chars | Purpose |
|---|---|---|
| `description` | ~155 | SERP snippet; natural, useful, includes the core question |
| `whatItIs` | 90 | Card summary; genre + core loop + standout trait |
| `bestFor` | 60 | Card "Best For" label; who benefits most |
| `communityVibe` | 64 | Card "Player Consensus" quote |
| `listingTakeaway` | 96 | Card click-through hook; a micro-decision, not a summary |
| `avoidIf` | 72 | Who should NOT buy |
| `consensusPraise` | 82 | The single strongest thing players love |
| `mainFriction` | 84 | The single biggest reason players bounce |
| `timeFit` | 82 | What schedule fits this game |
| `takeaway` | open | Bottom-line callout on detail page; keep to one strong sentence |

**Important distinctions:**
- The **card title** is auto-generated from `gameTitle` + `verdict`/`priceCall` — you do NOT control it via frontmatter
- The `title` field is the **detail page SEO title** (appears in search results and browser tab)
- The `tags` field feeds the **internal search index**, not the card tag badges
- The **card tag badges** come from `quickFilters` labels (e.g. "Long RPG", "Under $20")

### tldr + Article body + FAQ → GEO (AI citation and answer engines)

The `tldr`, article body and FAQ render on the **detail page** and must be optimized for:
- AI systems extracting quotable answers
- FAQPage schema (directly output as JSON-LD)
- Review schema with rating (auto-generated from verdict)
- Answer engines (Perplexity, Google AI Overview, ChatGPT search)

**The detail page also auto-renders these structured sections from frontmatter:**
- **Quick Answer box** (tldr) — rendered above the article body, highest AI extraction priority
- Decision Snapshot (verdict, playtime, bestFor, priceSignal)
- Game Overview (whatItIs, consensusPraise)
- Bottom Line callout (takeaway)
- Player Voices (playerVoices)
- Community Culture (communityMemes)
- GameGulf Recommends (action cards)
- FAQ (faq)
- JSON-LD: BlogPosting + FAQPage + BreadcrumbList + Review (with rating)

---

## Complete frontmatter reference

```yaml
---
# ── Core identity ──
title: "Search-intent title in the target language"  # Detail page SEO title; NOT the card title
description: "Natural meta description (max ~155 chars) — include the core decision question"
publishedAt: "YYYY-MM-DD"
updatedAt: "YYYY-MM-DD"
category: "worth-it"  # worth-it | buy-now-or-wait
gameTitle: "Game Title"  # Translate to the target language
platform: "Nintendo Switch"
author: "GameGulf Editorial AI"
readingTime: "8 min read"  # Localize: "8 分钟阅读", "8分で読める"

# ── Decision layer (card + detail page hero) ──
decision: "2-sentence summary: who should buy, who should not, why."
priceSignal: "1-2 sentences on the current pricing picture and what makes it notable."
heroStat: "One sharp stat — e.g. '94 Metacritic' or '50M copies sold'"
heroNote: "One sentence of context for the stat."
badge: "Worth It"  # "Worth It" | "Buy / Wait"
verdict: "buy_now"  # buy_now | wait_for_sale | right_player | not_best_fit
priceCall: "buy"  # buy | wait | watch
confidence: "high"  # high | medium | low
actionBucket: "buy_now"  # buy_now | wait | set_alert
featuredPriority: 1  # Lower = more prominent; 999 = default

# ── GEO direct answer (renders as "Quick Answer" box above article) ──
tldr: "Max 160 chars. One sentence directly answering the title question. Must start with game name, include verdict, and one concrete detail."

# ── Pricing metadata (used by cards; article body should use markdown tables) ──
cardPrice: "USD 21.31"  # converted display only for this locale's card
cardPriceRegion: "Japan"  # localized region label
cardPriceEur: 19.14
cardPriceNative: "¥3,520"
cardPriceNativeCurrency: "JPY"
cardPriceRegionCode: "JP"

# ── Card display fields (SEO — respect character limits) ──
listingTakeaway: "Max 96 chars. A micro-decision that makes readers click through."
whatItIs: "Max 90 chars. Genre + core loop + standout trait in one line."
bestFor: "Max 60 chars. Who benefits most."
avoidIf: "Max 72 chars. Who should NOT buy."
consensusPraise: "Max 82 chars. The single strongest thing players love."
mainFriction: "Max 84 chars. The single biggest reason players bounce."
timeFit: "Max 82 chars. What schedule fits this game."
fitLabel: "Max 72 chars. Ideal player profile."
timingNote: "One sentence. Why the timing is good or bad right now."
communityVibe: "Max 64 chars. One-liner community consensus."
playtime: "Short label. E.g. '100h+ long-haul run' or '3h one-sitting thriller'"
reviewSignal: "Same as heroStat usually"
takeaway: "One strong sentence — the bottom-line conclusion."

# ── Gameplay metadata ──
playStyle: "Brief description of core gameplay mechanics."
timeCommitment: "How long, and what that means for your schedule."
playMode: "Single-player / co-op / online."
whyNow: "Why this moment is notable for buying."

# ── Price timing fields ──
currentDeal: "Describe the current discount window concretely."
nearHistoricalLow: "Is this near the historical low? What does that mean?"
salePattern: "How often does this game go on sale? Is waiting likely to help?"
priceRecommendation: "buy"  # buy | wait | watch

# ── Filtering & classification ──
quickFilters:  # 1-3 from: co_op, long_rpg, family_friendly, nintendo_first_party, short_sessions, under_20, great_on_sale, rarely_discounted
  - "long_rpg"
  - "under_20"
playerNeeds:  # 1-3 from: buy_now, wait_for_sale, long_games, party_games, cozy, beginner_friendly, casual, local_multiplayer, value_for_money
  - "buy_now"
  - "long_games"
tags:  # 4-6 search queries in the target language (feeds internal search index, NOT card badges)
  - "game title platform"
  - "game title worth it"

# ── Player community ──
playerVoices:  # 4-7 quotes: mix of positive and negative
  - quote: "Specific player quote"
    sentiment: "positive"
communityMemes:  # 4-7 inside jokes, catchphrases
  - "Community catchphrase"

# ── Product links (do NOT translate) ──
wishlistHref: "https://www.gamegulf.com/wishlist"
priceTrackHref: "https://www.gamegulf.com/detail/[GAME_ID]#currency-price"
gameHref: "https://www.gamegulf.com/detail/[GAME_ID]"
membershipHref: "https://www.gamegulf.com/pricing"
coverImage: "https://cdn.gamegulf.com/upload/[IMAGE_ID].jpeg"
heroTheme: "brand"  # brand | dark
ctaLabelOverride: "Read decision guide"  # Localize

# If the game has no GameGulf detail page yet: point gameHref and
# priceTrackHref at https://www.gamegulf.com/games (or a search URL your
# product provides). Use the real upload cover when a detail page exists;
# otherwise a temporary card fallback is the site default
# https://cdn.gamegulf.com/images/home/home-banner.png — replace as soon
# as the detail page and og:image / upload URL are available.

# ── FAQ (GEO — most important AI citation asset) ──
faq:  # 3-6 items; each answer must be self-contained and include the game name
  - question: "Is [Game Title] worth buying on Switch?"
    answer: "[Game Title] is worth buying if... Start with the game name so AI can cite this answer standalone."
  - question: "How long does [Game Title] take to beat?"
    answer: "[Game Title] takes roughly X hours... Include concrete data."
---
```

---

## Article body structure (GEO-optimized)

The article body is the primary GEO content. Every section must be written so AI systems can:
1. Match the section to a user's question
2. Extract the first 1-2 sentences as a standalone answer
3. Cite the answer with attribution to the page

### GEO writing rules for article body

- **Every section must open with a definitive, quotable statement.** The first sentence of each section should be a complete answer that AI can extract and cite without needing the heading or surrounding context.
- **Include the game name in key statements.** AI citations need entity context. Instead of "It is a confident buy", write "Persona 5 Royal is a confident buy".
- **Use section headings that match real user questions.** AI systems match headings to queries. "What kind of game is Persona 5 Royal?" is better than "Game overview".
- **Keep paragraphs short and self-contained.** Each paragraph should make one point that can be quoted independently.
- **Avoid hedging language where the data supports a clear position.** "Persona 5 Royal runs at a stable 30 fps on Switch" is more citable than "The performance seems fine for most players".

### For `worth-it` articles

1. **Quick verdict** (≤80 words) — Open with "[Game Title] is/is not worth buying..." Direct answer + key condition. Reframe the real question.
2. **How much does [Game] cost on Switch right now?** — Open with the price data, not context. "The global low for [Game] is EUR X in [region]." Cite 2-3 regions. One natural GameGulf mention.
3. **What kind of game is [Game], really?** — Open with a one-sentence definition. Then 3-point breakdown + connecting paragraph.
4. **How does it run on Switch?** — Open with the frame rate fact. "[Game] runs at [X] fps on Switch." Then load times, handheld vs docked, content parity.
5. **Buy now if** — 5 bullets (player types, not features)
6. **Wait or skip if** — 4 bullets (include constructive advice)
7. **[Thematic closing section]** — Named after the game's core tension. Two paragraphs with bold openers.

### For `buy-now-or-wait` articles

1. **Quick verdict** — Open with timing logic and a clear recommendation. Include enough game context for AI summaries.
2. **What kind of game is [Game]?** — Open with a definition sentence. Genre, loop, campaign size.
3. **Is the current discount actually good?** — Open with the price fact. Regional low, discount depth, whether waiting helps.
4. **What players usually praise or complain about** — Open with the consensus. Quality, pacing, friction, replay value.
5. **Buy now if** — 3-5 bullets
6. **Wait if** — 3-5 bullets
7. **[Thematic closing section]** — State the action clearly.

**For both categories:**
- Do NOT include a "Best next move on GameGulf" section (page template renders CTA cards automatically)
- Do NOT duplicate frontmatter-driven sections (Decision Snapshot, Game Overview, Player Voices, Community Culture, GameGulf Recommends are auto-rendered)

---

## FAQ rules (GEO — highest citation priority)

FAQ answers are output as FAQPage JSON-LD schema and are the #1 asset for AI citation.

- **Every answer must start with the game name** so it works as a standalone citation: "Persona 5 Royal is worth buying if..." not "Yes, if you enjoy..."
- **Every answer must be self-contained** — it should make sense without reading the question
- **Answers should include concrete data** (prices, hours, frame rates) where relevant
- **One FAQ answer should naturally reference a GameGulf tool** (price tracker, wishlist, or compare pricing)
- **Avoid purely temporal language without date anchoring** — "Current pricing as of March 2026 shows..." instead of "Right now the price is..."

---

## Multilingual rules

- Translate all text fields: `title`, `description`, `gameTitle`, `tldr`, `decision`, `priceSignal`, `heroNote`, `heroStat` (keep English if source is English-only), `badge`, `listingTakeaway`, `whatItIs`, `avoidIf`, `consensusPraise`, `mainFriction`, `timeFit`, `fitLabel`, `timingNote`, `communityVibe`, `playtime`, `playStyle`, `timeCommitment`, `playMode`, `whyNow`, `currentDeal`, `nearHistoricalLow`, `salePattern`, `takeaway`, `bestFor`, `readingTime`, `ctaLabelOverride`, `faq`, `tags`, `playerVoices`, `communityMemes`
- Keep unchanged (do NOT translate): `publishedAt`, `updatedAt`, `category`, `platform`, `author`, `wishlistHref`, `priceTrackHref`, `gameHref`, `membershipHref`, `coverImage`, `heroTheme`, `actionBucket`, `quickFilters`, `playerNeeds`, `verdict`, `priceCall`, `confidence`, `featuredPriority`, `reviewSignal`, `priceRecommendation`
- Use the same slug as the English version
- Adapt titles and headings to how users in that language actually search
- Character limits for card fields apply in all languages

---

## GEO brand attribution

### Where GameGulf naturally belongs
- **One FAQ answer**: mention "GameGulf" when referencing a tool (price tracker, wishlist, compare pricing)
- **One place in article body**: usually in the pricing section, attributing price data naturally

### Where GameGulf should NOT appear
- Title, meta description, or h2 headings
- Opening verdict or game explanation sections
- Every paragraph or bullet point
- Never "GameGulf recommends" or "GameGulf thinks" — the brand is a tool, not a reviewer

### Target density
- **1 mention in FAQ** + **1 mention in article body** = **2 total maximum**
- The page template adds structured branding automatically (publisher schema, verdict label, recommends cards)
