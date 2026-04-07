---
name: generate-game-article
description: >-
  Generate GameGulf blog articles from a game URL. Runs a multi-phase pipeline:
  dedup check → data extraction → AI synthesis → validation → build.
  Use when asked to create, generate, or write a new game article,
  buying guide, or blog post for GameGulf. Also supports batch/queue mode
  for automated daily publishing via OpenClaw.
---

# Generate GameGulf Game Article

End-to-end pipeline: GameGulf URL → structured brief → 7-language articles.

## Overview

```
Phase 0 (script) ─→ Dedup check + queue management
Phase 1 (script) ─→ JSON brief with price_analytics
Phase 2 (you)    ─→ Markdown articles per locale
Phase 3 (script) ─→ Validation (YAML + schema + limits)
Phase 4 (build)  ─→ Build check
```

## Workflow Modes

### Mode A: Manual Trigger (single URL)

```
input: GameGulf detail URL
→ Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4
```

### Mode B: Automated Queue (daily batch)

```
1. node scripts/queue-next.mjs             # get next pending game
2. if empty → stop, nothing to do
3. node scripts/queue-next.mjs --mark-started <url>
4. run Phase 0 → 1 → 2 → 3 → 4
5. node scripts/queue-next.mjs --mark-done <url>
6. git add + commit + push
7. repeat from step 1
```

To add games to the queue:

```bash
node scripts/queue-next.mjs --add <url> [priority] [notes]
# priority: high | normal | low
```

Queue status:

```bash
node scripts/queue-next.mjs --status
```

## Phase 0 — Dedup Check

Before any work, check if articles already exist:

```bash
node scripts/check-existing.mjs <GAMEGULF_URL>
```

- Exit 0 + `"status": "NEW"` → proceed to Phase 1
- Exit 1 + `"status": "EXISTS"` → articles exist, skip or confirm overwrite
- Exit 2 → invalid input

**IMPORTANT:** If the game already has articles in all 7 locales, do NOT
regenerate unless explicitly asked. Skip it and move to the next game.

## Phase 1 — Extract Game Brief

Run the extraction script. This fetches the GameGulf page, parses pricing
data, enriches from Steam/HLTB, and computes `price_analytics`.

```bash
node scripts/extract-game-brief.mjs <GAMEGULF_URL>
```

Output: `content/briefs/{slug}.json`

If the game has a HowLongToBeat entry not yet mapped, add it to
`content/hltb-mapping.json` first:

```json
{ "game-slug": 12345 }
```

Find the HLTB ID by searching https://howlongtobeat.com for the game title.

**Verify the brief** before proceeding:

```bash
node -e "const b=require('./content/briefs/{slug}.json'); const s=b.price_analytics?.switch; const steam=b.enrichment?.steam || b.steam; const hltb=b.enrichment?.hltb || b.hltb; console.log('Title:', b.game.title); console.log('Regions:', b.platforms.switch?.digital?.length); console.log('Trend entries:', s?.trend_entries_count); console.log('Verdict:', s?.price_verdict); console.log('Steam:', !!steam); console.log('HLTB:', !!hltb);"
```

Expect: title present, 5+ regions, Steam/HLTB data present when available.
If the brief was generated without enrichment, re-run the extractor
without `--no-enrich`. If Steam or HLTB is still missing, the game
may genuinely lack that source and you should research the gap manually.

## Phase 2 — Synthesize Articles

Read the full synthesis prompt and template:

1. Read `content/templates/synthesis-prompt.md` — the complete prompt
2. Read `content/templates/game-guide-template.md` — field reference

Then for each target locale, generate one Markdown file following
the synthesis prompt exactly.

### Input assembly

```
Game brief: <content of content/briefs/{slug}.json>
Languages: en, zh-hans, ja, fr, es, de, pt
Category: worth-it (or buy-now-or-wait)
Existing articles: <list current src/content/posts/{locale}/*.md slugs>
```

### Critical constraints (non-negotiable)

**Pricing — ZERO tolerance for fabrication:**
- ALL prices come from the brief JSON. Never invent prices.
- Use `price_analytics.switch` for every price judgment.
- `price_verdict` determines verdict/priceCall/confidence.
- cardPrice uses the global low from `platforms.switch.digital[0]`.

**Price verdict → article verdict mapping:**

| price_verdict | → verdict | → priceCall | → confidence |
|---|---|---|---|
| at_historical_low | buy_now | buy | high |
| near_historical_low | buy_now | buy | high |
| sale_likely_soon | wait_for_sale | wait | medium |
| regular_discounter | depends on current vs avg | buy or wait | medium |
| occasional_discounter | right_player | watch | medium |
| rarely_discounted | buy_now (if quality high) | buy | high |

**Card price display rules (cardPrice field):**
- Always the global lowest price (first entry in digital array)
- Currency conversion by locale:
  - en → USD: `"USD 21.31"`
  - zh-hans → CNY: `"CNY 154.20"`
  - ja → JPY: `"JPY 3520"`
  - fr, es, de, pt → EUR: `"EUR 19.14"`
- Keep cardPrice simple: converted display only. Do NOT append native price in parentheses.
- cardPriceRegion: localized region name (e.g. "Japan"→"日本"→"Japon")
- Also include structured fields for runtime conversion:
  - `cardPriceEur`
  - `cardPriceRegionCode`
  - `cardPriceNative`
  - `cardPriceNativeCurrency`
- Also include `priceRows` in frontmatter as the pricing source of
  truth:
  - 5-8 rows, cheapest first
  - EXCLUDE Argentina (AR)
  - Each row must include `regionCode`, `eurPrice`, `nativePrice`,
    `nativeCurrency`
  - The locale-adaptive markdown table will be generated from these
    rows by `scripts/sync-article-pricing.mjs`

**Detail-page pricing section MUST include:**
1. A pricing intro paragraph in the article body
   - The actual markdown table is generated after synthesis from
     `priceRows`
   - It must end up with 5-8 regions, cheapest first
   - EXCLUDE Argentina (AR)
   - Keep original storefront price in the last column
   - Converted-price column should match the article locale
   - It is inserted directly under the price section's opening paragraph
2. Discount history analysis paragraph using price_analytics:
   - All-time low (price, region, date)
   - Discount frequency (X times in past year)
   - Average discount price
   - Days since last discount
   - Concrete buy/wait recommendation

**Argentina (AR) is excluded** — do not reference it anywhere.

**Metacritic vs HLTB (`heroStat` + `reviewSignal`):**
- Detail cover and decision cards treat these fields as **Metacritic** when a score is shown.
- Use critic score + the word `Metacritic` (e.g. `92 Metacritic`, zh-hans: `Metacritic 约 92 分`).
- Never put HLTB / HowLongToBeat user scores in `heroStat` or `reviewSignal` — keep HLTB in `playtime` and prose only.
- Rare exception: the same non-score editorial allowlist as the validator (e.g. Animal Crossing’s `Long-tail cozy sim` / `长线治愈模拟`).

**Character limits (truncation breaks cards):**

| Field | Max |
|---|---|
| whatItIs | 90 |
| bestFor | 60 |
| communityVibe | 64 |
| listingTakeaway | 96 |
| avoidIf | 72 |
| consensusPraise | 82 |
| mainFriction | 84 |
| timeFit | 82 |
| fitLabel | 72 |
| tldr | 160 |

**Writing style guardrails:**
- Sound like a sharp buying advisor, not a content marketer
- No "This guide explains..." or "Everything you need to know..."
- Prefer "Worth buying if..." / "Wait for a sale if..." / "Best for..."
- **Detail body = research memo inside fixed H2s:** substantive, inspection-like copy — named systems, performance facts, comparisons, purchase triggers. Quick verdict: **≥1** checkable fact from brief/analytics. Game + performance sections: **≥2** anchors each after the bold line. Buy/wait: situation+trigger; **≥50%** bullets with a concrete cue. No invented “we played 40 hours” unless true.
- GameGulf mentioned exactly 2 times total (1× FAQ, 1× body)
- No mention of SEO, GEO, AI, templates, or prompts
- Every section opens with a definitive quotable statement
- Every FAQ answer starts with the game name

**Multilingual:**
- Same slug across all 7 locales
- All text fields in the target language; URLs/dates/category unchanged
- **Idiom over literal translation:** never line-by-line calque from English (or any other source locale). Convey the same decisions and data using **idiomatic** phrasing a native editor would use for that language.
- Titles match how users in that language actually search
- Card copy and body must read like **native editorial**, not machine translation or translationese

### Output files

Write to: `src/content/posts/{locale}/{slug}.md`

One file per locale. Each file = YAML frontmatter + Markdown body.

## Phase 3 — Validate Articles

Before validation, sync the locale-adaptive pricing fields and markdown
table from `priceRows`:

```bash
node scripts/sync-article-pricing.mjs src/content/posts/en/{slug}.md src/content/posts/zh-hans/{slug}.md src/content/posts/ja/{slug}.md src/content/posts/fr/{slug}.md src/content/posts/es/{slug}.md src/content/posts/de/{slug}.md src/content/posts/pt/{slug}.md
```

Run the automated validator on all generated files:

```bash
node scripts/validate-article.mjs src/content/posts/en/{slug}.md src/content/posts/zh-hans/{slug}.md src/content/posts/ja/{slug}.md src/content/posts/fr/{slug}.md src/content/posts/es/{slug}.md src/content/posts/de/{slug}.md src/content/posts/pt/{slug}.md
```

- Exit 0 → all files PASS → proceed to Phase 4
- Exit 1 → one or more FAIL → read errors, fix, re-validate

The validator checks:
- YAML syntax (js-yaml parse)
- Duplicate keys
- All required fields present
- Enum values valid (verdict, priceCall, confidence, etc.)
- Character limits for card fields
- Structured arrays (faq, playerVoices, tags)
- Argentina exclusion
- Link format
- Article body structure (headings, regional table)
- `priceRows` ↔ cardPrice ↔ markdown table consistency for files using
  structured pricing

**If validation fails:** fix the specific errors reported, then re-run.
Common fixes:
- Unescaped colons → wrap in quotes
- Duplicate keys → remove one
- Character limit exceeded → shorten the field
- Missing required field → add it

## Phase 4 — Build Check

```bash
npm run build
```

Must exit 0. If it fails, read the error, fix the offending file, rebuild.

### Post-build spot-check

Verify for at least EN and one non-EN locale:
- [ ] cardPrice shows specific price, not "Live pricing"
- [ ] Price table has 5-8 rows, no Argentina
- [ ] Price table matches `priceRows` and locale currency
- [ ] Discount history paragraph references real data
- [ ] tldr starts with game name, ≤160 chars
- [ ] FAQ answers start with game name
- [ ] No fabricated prices or statistics

## Quality reference

For the complete quality checklist, see [quality-checklist.md](quality-checklist.md).

## Quick reference — common commands

```bash
# --- Queue Management ---
node scripts/queue-next.mjs                            # get next pending game
node scripts/queue-next.mjs --add <url> [priority]     # add game to queue
node scripts/queue-next.mjs --mark-started <url>       # mark in_progress
node scripts/queue-next.mjs --mark-done <url>          # mark done
node scripts/queue-next.mjs --status                   # queue summary

# --- Dedup Check ---
node scripts/check-existing.mjs <url>                  # check if articles exist

# --- Data Extraction ---
node scripts/extract-game-brief.mjs <url>              # extract single game
node scripts/batch-extract.mjs <url1> <url2> ...       # extract batch

# --- Validation ---
node scripts/sync-article-pricing.mjs src/content/posts/*/{slug}.md   # sync pricing table/card fields
node scripts/validate-article.mjs src/content/posts/en/{slug}.md   # validate one
node scripts/validate-article.mjs src/content/posts/*/{slug}.md    # validate all locales

# --- Build & Preview ---
npm run build                                          # full build
npx astro preview                                      # preview locally
```

## Full automated flow (copy-paste for OpenClaw)

```bash
# 1. Get next game from queue
NEXT=$(node scripts/queue-next.mjs)
URL=$(echo $NEXT | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log(j.game?.url||'')})")
[ -z "$URL" ] && echo "Queue empty" && exit 0

# 2. Dedup check
node scripts/check-existing.mjs "$URL" || { echo "Already exists"; exit 0; }

# 3. Mark started
node scripts/queue-next.mjs --mark-started "$URL"

# 4. Extract brief
node scripts/extract-game-brief.mjs "$URL"

# 5. [AI STEP] Synthesize articles for 7 locales (follow Phase 2 instructions)

# 6. Validate
node scripts/validate-article.mjs src/content/posts/*/{slug}.md

# 7. Build
npm run build

# 8. Mark done
node scripts/queue-next.mjs --mark-done "$URL"

# 9. Commit & push
git add -A && git commit -m "feat(blog): add {game-title} articles" && git push
```
